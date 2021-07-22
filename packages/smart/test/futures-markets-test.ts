import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { expect } from "chai";

import {
  Cash,
  Cash__factory,
  FeePot,
  FeePot__factory,
  FuturesMarketFactory,
  FuturesMarketFactory__factory,
} from "../typechain";
import { BigNumber, BigNumberish } from "ethers";
import { calcShareFactor } from "../src";
import { describe } from "mocha";
import { MAX_UINT } from "../src/bmath";

const BASIS = BigNumber.from(10).pow(18);
const ONE_DAY = BigNumber.from(60 * 60 * 24);
const SMALL_FEE = BigNumber.from(10).pow(16);

enum GroupMarketType {
  Unknown = 0,
  BeingCreated,
  Regular,
  Invalid,
}

enum GroupStatus {
  Unknown = 0,
  BeingCreated,
  Scheduled,
  Final,
  Invalid,
}

describe("Futures Markets", () => {
  const now = BigNumber.from(Date.now()).div(1000);

  const validGroup = {
    id: BigNumber.from(9001),
    endTime: now.add(ONE_DAY),
    invalid: { name: "No Contest", marketId: BigNumber.from(1) },
    teams: [
      { name: "Corpos", marketId: BigNumber.from(2) },
      { name: "Nomads", marketId: BigNumber.from(3) },
      { name: "Street Kids", marketId: BigNumber.from(4) },
      { name: "Netrunners", marketId: BigNumber.from(5) },
      { name: "Animals", marketId: BigNumber.from(6) },
    ],
  };

  const invalidGroup = {
    id: BigNumber.from(555),
    endTime: now.add(ONE_DAY),
    invalid: { name: "Retcon", marketId: BigNumber.from(7) },
    teams: [
      { name: "Shield", marketId: BigNumber.from(8) },
      { name: "Hydra", marketId: BigNumber.from(9) },
      { name: "Guardians of the Galaxy", marketId: BigNumber.from(10) },
      { name: "Nova", marketId: BigNumber.from(11) },
      { name: "Inhumans", marketId: BigNumber.from(12) },
      { name: "USA", marketId: BigNumber.from(13) },
    ],
  };

  let signer: SignerWithAddress;
  let collateral: Cash;
  let reputationToken: Cash;
  let feePot: FeePot;
  let marketFactory: FuturesMarketFactory;

  const OUTCOME_NO = 0;
  const OUTCOME_YES = 1;
  const ODDS = ratioOdds([1, 5]);

  before(async () => {
    [signer] = await ethers.getSigners();
  });

  it("deploys", async () => {
    collateral = await new Cash__factory(signer).deploy("USDC", "USDC", 6); // 6 decimals to mimic USDC
    reputationToken = await new Cash__factory(signer).deploy("REPv2", "REPv2", 18);
    feePot = await new FeePot__factory(signer).deploy(collateral.address, reputationToken.address);
    const shareFactor = calcShareFactor(await collateral.decimals());
    marketFactory = await new FuturesMarketFactory__factory(signer).deploy(
      signer.address,
      collateral.address,
      shareFactor,
      feePot.address,
      [SMALL_FEE, SMALL_FEE, SMALL_FEE],
      signer.address,
      signer.address // pretending the deployer is a link node for testing purposes
    );

    expect(await marketFactory.getOwner()).to.equal(signer.address);
    expect(await marketFactory.feePot()).to.equal(feePot.address);
    expect(await marketFactory.collateral()).to.equal(collateral.address);
  });

  it("creates valid group", async () => {
    await marketFactory.initializeGroup(validGroup.id, validGroup.invalid.name, validGroup.endTime);

    let group = await marketFactory.getGroup(validGroup.id);
    expect(group.status, "group is initialized").to.equal(GroupStatus.BeingCreated);

    for (const team of validGroup.teams) {
      await marketFactory.addOutcomesToGroup(validGroup.id, [team.name], [ODDS]);
    }

    group = await marketFactory.getGroup(validGroup.id);
    expect(group.markets.length, "group market length").to.equal(validGroup.teams.length);
    for (const marketId of group.markets) {
      const market = await marketFactory.getMarket(marketId);
      expect(market.active, `market ${marketId} inactive`).to.be.false;
    }

    await marketFactory.finalizeGroup(validGroup.id);

    group = await marketFactory.getGroup(validGroup.id);
    expect(group.status, "group is finalized").to.equal(GroupStatus.Scheduled);
    for (const marketId of group.markets) {
      const market = await marketFactory.getMarket(marketId);
      expect(market.active, `market ${marketId} is active`).to.be.true;
    }
  });

  it("logs MarketCreated", async () => {
    const filter = marketFactory.filters.MarketCreated(null, null, null);
    const logs = (await marketFactory.queryFilter(filter)).map((log) => {
      const { id, names, initialOdds } = log.args;
      return { id, names, initialOdds };
    });

    const m = (id: BigNumberish, name: string, initialOdds = ODDS) => ({
      id: BigNumber.from(id),
      names: buildOutcomeNames(name),
      initialOdds,
    });

    expect(logs, "logs").to.deep.equal([
      m(validGroup.invalid.marketId, validGroup.invalid.name, ratioOdds([49, 1])),
      m(validGroup.teams[0].marketId, validGroup.teams[0].name),
      m(validGroup.teams[1].marketId, validGroup.teams[1].name),
      m(validGroup.teams[2].marketId, validGroup.teams[2].name),
      m(validGroup.teams[3].marketId, validGroup.teams[3].name),
      m(validGroup.teams[4].marketId, validGroup.teams[4].name),
    ]);
  });

  it("logs GroupCreated", async () => {
    const filter = marketFactory.filters.GroupCreated(validGroup.id, null, null, null);
    const logs = (await marketFactory.queryFilter(filter)).map((log) => {
      const { id, endTime, invalidMarketId, invalidMarketName } = log.args;
      return { id, endTime, invalidMarketId, invalidMarketName };
    });

    expect(logs).to.deep.equal([
      {
        id: validGroup.id,
        endTime: validGroup.endTime,
        invalidMarketId: validGroup.invalid.marketId,
        invalidMarketName: validGroup.invalid.name,
      },
    ]);
  });

  it("logs GroupMarketAdded", async () => {
    const filter = marketFactory.filters.GroupMarketAdded(validGroup.id, null, null);
    const logs = (await marketFactory.queryFilter(filter)).map((log) => {
      const { groupId, marketId, marketName } = log.args;
      return { groupId, marketId, marketName };
    });

    const m = (marketId: BigNumberish, marketName: string) => ({
      groupId: validGroup.id,
      marketId: BigNumber.from(marketId),
      marketName,
    });

    expect(logs).to.deep.equal([
      m(validGroup.invalid.marketId, validGroup.invalid.name),
      m(validGroup.teams[0].marketId, validGroup.teams[0].name),
      m(validGroup.teams[1].marketId, validGroup.teams[1].name),
      m(validGroup.teams[2].marketId, validGroup.teams[2].name),
      m(validGroup.teams[3].marketId, validGroup.teams[3].name),
      m(validGroup.teams[4].marketId, validGroup.teams[4].name),
    ]);
  });

  it("logs GroupReady", async () => {
    const filter = marketFactory.filters.GroupReady(validGroup.id);
    const ids = (await marketFactory.queryFilter(filter)).map((log) => log.args.id);
    expect(ids).to.deep.equal([validGroup.id]);
  });

  it("resolve a market early", async () => {
    await marketFactory.resolveMarketAsNo(validGroup.teams[0].marketId);
  });

  it("log MarketResolved for early-resolved market", async () => {
    const marketId = validGroup.teams[0].marketId;
    const market = await marketFactory.getMarket(marketId);
    const winner = market.shareTokens[OUTCOME_NO];
    const filter = marketFactory.filters.MarketResolved(null, null, null, null);
    const logs = (await marketFactory.queryFilter(filter))
      .map((log) => {
        const { id, winner } = log.args;
        return { id, winner };
      })
      .filter((log) => log.id.eq(marketId));

    expect(logs).to.deep.equal([{ id: marketId, winner }]);
  });

  it("log GroupResolved (none)", async () => {
    const filter = marketFactory.filters.GroupResolved(null, null);
    const logs = await marketFactory.queryFilter(filter);

    expect(logs).to.deep.equal([]);
  });

  it("resolve the valid group", async () => {
    const winningMarketIndex = 1;
    await marketFactory.resolveGroup(validGroup.id, winningMarketIndex);
  });

  it("log MarketResolved for all markets", async () => {
    const filter = marketFactory.filters.MarketResolved(null, null, null, null);
    const logs = (await marketFactory.queryFilter(filter)).map((log) => {
      const { id, winner } = log.args;
      return { id, winner };
    });

    const m = async (marketId: BigNumberish, winningOutcome: number) => {
      const market = await marketFactory.getMarket(marketId);
      const winner = market.shareTokens[winningOutcome];

      return {
        id: BigNumber.from(marketId),
        winner,
      };
    };

    expect(logs).to.deep.equal(
      await Promise.all([
        m(validGroup.teams[0].marketId, OUTCOME_NO),
        m(validGroup.invalid.marketId, OUTCOME_NO),
        m(validGroup.teams[1].marketId, OUTCOME_YES),
        m(validGroup.teams[2].marketId, OUTCOME_NO),
        m(validGroup.teams[3].marketId, OUTCOME_NO),
        m(validGroup.teams[4].marketId, OUTCOME_NO),
      ])
    );
  });

  it("log GroupResolved for the valid group", async () => {
    const filter = marketFactory.filters.GroupResolved(null, null);
    const logs = (await marketFactory.queryFilter(filter)).map(({ args }) => ({ id: args.id, valid: args.valid }));
    expect(logs).to.deep.equal([{ id: validGroup.id, valid: true }]);
  });

  it("create invalid group", async () => {
    await marketFactory.initializeGroup(invalidGroup.id, invalidGroup.invalid.name, invalidGroup.endTime);
    for (const team of invalidGroup.teams) {
      await marketFactory.addOutcomesToGroup(invalidGroup.id, [team.name], [ODDS]);
    }
    await marketFactory.finalizeGroup(invalidGroup.id);
  });

  it("logs GroupReady", async () => {
    const filter = marketFactory.filters.GroupReady(invalidGroup.id);
    const ids = (await marketFactory.queryFilter(filter)).map((log) => log.args.id);
    expect(ids).to.deep.equal([invalidGroup.id]);
  });

  it("resolve a market early for the invalid group", async () => {
    await marketFactory.resolveMarketAsNo(invalidGroup.teams[0].marketId);
  });

  it("resolve the invalid group", async () => {
    await marketFactory.resolveGroup(invalidGroup.id, MAX_UINT);
  });

  it("log MarketResolved for the invalid group", async () => {
    const filter = marketFactory.filters.MarketResolved(null, null, null, null);
    const logs = (await marketFactory.queryFilter(filter)).map((log) => {
      const { id, winner } = log.args;
      return { id, winner };
    });

    const m = async (marketId: BigNumberish, winningOutcome: number) => {
      const market = await marketFactory.getMarket(marketId);
      const winner = market.shareTokens[winningOutcome];

      return {
        id: BigNumber.from(marketId),
        winner,
      };
    };

    expect(logs).to.deep.equal(
      await Promise.all([
        // first, the logs for the valid group
        m(validGroup.teams[0].marketId, OUTCOME_NO),
        m(validGroup.invalid.marketId, OUTCOME_NO),
        m(validGroup.teams[1].marketId, OUTCOME_YES),
        m(validGroup.teams[2].marketId, OUTCOME_NO),
        m(validGroup.teams[3].marketId, OUTCOME_NO),
        m(validGroup.teams[4].marketId, OUTCOME_NO),
        // now the ones for the invalid group
        m(invalidGroup.teams[0].marketId, OUTCOME_NO),
        m(invalidGroup.invalid.marketId, OUTCOME_YES),
        m(invalidGroup.teams[1].marketId, OUTCOME_NO),
        m(invalidGroup.teams[2].marketId, OUTCOME_NO),
        m(invalidGroup.teams[3].marketId, OUTCOME_NO),
        m(invalidGroup.teams[4].marketId, OUTCOME_NO),
        m(invalidGroup.teams[5].marketId, OUTCOME_NO),
      ])
    );
  });

  it("log GroupResolved for the invalid group", async () => {
    const filter = marketFactory.filters.GroupResolved(null, null);
    const logs = (await marketFactory.queryFilter(filter))
      .map(({ args }) => ({ id: args.id, valid: args.valid }))
      .filter((log) => log.id.eq(invalidGroup.id));
    expect(logs).to.deep.equal([{ id: invalidGroup.id, valid: false }]);
  });
});

function ratioOdds(proportions: BigNumberish[]) {
  const MAX_BPOOL_WEIGHT = BigNumber.from(10).pow(18).mul(50);
  const total = proportions.reduce((t: BigNumber, b: BigNumberish) => t.add(b), BigNumber.from(0));
  return proportions.map((p) => MAX_BPOOL_WEIGHT.mul(p).div(total));
}

function buildOutcomeNames(marketName: string): string[] {
  return [`NO - ${marketName}`, `YES - ${marketName}`];
}
