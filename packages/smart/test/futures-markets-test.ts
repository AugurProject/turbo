import { deployments, ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { expect } from "chai";
import { describe } from "mocha";

import {
  AMMFactory,
  Cash,
  FeePot,
  FuturesFetcher,
  FuturesMarketFactoryV3,
  Grouped,
  GroupFetcher,
  MasterChef,
} from "../typechain";
import { BigNumber, BigNumberish } from "ethers";
import { MAX_UINT } from "../src/bmath";
import { makePoolCheck, marketFactoryBundleCheck } from "./fetching";
import {
  DynamicGroupsMarket,
  fetchDynamicGroup,
  fetchInitialGroup,
  flatten,
  GroupMarketType,
  InitialGroupsMarket,
  range,
} from "../src";
import { createPoolStatusInfo } from "../src/fetcher/common";

const now = BigNumber.from(Date.now()).div(1000);
const ONE_DAY = BigNumber.from(60 * 60 * 24);
const validGroup = {
  id: BigNumber.from(9001),
  name: "Cyberpunk",
  category: "videogame",
  endTime: now.add(ONE_DAY),
  invalid: { name: "No Contest", marketId: BigNumber.from(1) },
  teams: [
    { name: "Corpos", marketId: BigNumber.from(2) },
    { name: "Nomads", marketId: BigNumber.from(3) },
    { name: "Street Kids", marketId: BigNumber.from(4) },
    { name: "Netrunners", marketId: BigNumber.from(5) },
    { name: "Animals", marketId: BigNumber.from(6) },
  ],
  winningMarketIndex: BigNumber.from(1),
};

type GroupSpec = typeof validGroup;

const secondGroup: GroupSpec = {
  id: BigNumber.from(555),
  name: "Hair",
  category: "aesthetic",
  endTime: now.add(ONE_DAY),
  invalid: { name: "Bald", marketId: BigNumber.from(7) },
  teams: [
    { name: "Yellow", marketId: BigNumber.from(8) },
    { name: "Brown", marketId: BigNumber.from(9) },
    { name: "Black", marketId: BigNumber.from(10) },
    { name: "White", marketId: BigNumber.from(11) },
    { name: "Purple", marketId: BigNumber.from(12) },
    { name: "Pink", marketId: BigNumber.from(13) },
    { name: "Blue", marketId: BigNumber.from(14) },
    { name: "Multicolored", marketId: BigNumber.from(15) },
  ],
  winningMarketIndex: MAX_UINT,
};

const invalidGroup: GroupSpec = {
  id: BigNumber.from(555),
  name: "Marvel",
  category: "superhero",
  endTime: now.add(ONE_DAY),
  invalid: { name: "Retcon", marketId: BigNumber.from(1) },
  teams: [
    { name: "Shield", marketId: BigNumber.from(2) },
    { name: "Hydra", marketId: BigNumber.from(3) },
    { name: "Guardians of the Galaxy", marketId: BigNumber.from(4) },
    { name: "Nova", marketId: BigNumber.from(5) },
    { name: "Inhumans", marketId: BigNumber.from(6) },
    { name: "USA", marketId: BigNumber.from(7) },
  ],
  winningMarketIndex: MAX_UINT,
};

describe("Futures Markets", () => {
  beforeEach(async () => {
    await deployments.fixture();
  });

  let signer: SignerWithAddress;
  beforeEach(async () => {
    [signer] = await ethers.getSigners();
  });

  let feePot: FeePot;
  let marketFactory: FuturesMarketFactoryV3;
  let ammFactory: AMMFactory;
  let masterChef: MasterChef;
  let collateral: Cash;
  beforeEach(async () => {
    feePot = (await ethers.getContract("FeePot")) as FeePot;
    ammFactory = (await ethers.getContract("AMMFactory")) as AMMFactory;
    masterChef = (await ethers.getContract("MasterChef")) as MasterChef;
    collateral = (await ethers.getContract("Collateral")) as Cash;
    marketFactory = (await ethers.getContract("FuturesMarketFactory")) as FuturesMarketFactoryV3;
  });

  it("deploys correctly", async () => {
    expect(await marketFactory.getOwner()).to.equal(signer.address);
    expect(await marketFactory.feePot()).to.equal(feePot.address);
    expect(await marketFactory.collateral()).to.equal(collateral.address);
  });

  describe("creates group", () => {
    beforeEach("initialize group", async () => {
      await initializeGroup(validGroup, marketFactory);
    });

    it("group state is correct", async () => {
      const group = await marketFactory.getGroup(validGroup.id);
      expect(group.status, "group is initialized").to.equal(GroupStatus.Scheduled);
      expect(group.markets.length, "group market length").to.equal(validGroup.teams.length);
      for (const marketId of group.markets) {
        const market = await marketFactory.getMarket(marketId);
        expect(market.active, `market ${marketId} active`).to.be.true;
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

    describe("resolve market early", () => {
      beforeEach("resolve market as no", async () => {
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
    });

    describe("resolve group", () => {
      beforeEach("initiate group resolution", async () => {
        await marketFactory.beginResolvingGroup(validGroup.id, validGroup.winningMarketIndex);
      });

      it("group is finalizing", async () => {
        const group = await marketFactory.getGroup(validGroup.id);
        expect(group.status, "group is finalizing").to.equal(GroupStatus.Finalizing);
        expect(group.winningMarketIndex, "winningMarketIndex").to.equal(validGroup.winningMarketIndex);
      });

      describe("begin resolving", () => {
        beforeEach("resolve markets", async () => {
          await resolveMarkets(validGroup, marketFactory);
        });

        it("markets resolved correctly", async () => {
          const group = await marketFactory.getGroup(validGroup.id);
          for (const marketIndex of range(0, group.markets.length)) {
            const marketId = group.markets[marketIndex];
            const market = await marketFactory.getMarket(marketId);
            const won = BigNumber.from(marketIndex).eq(validGroup.winningMarketIndex);
            const winnerIndex = won ? OUTCOME_YES : OUTCOME_NO;
            expect(market.active, `market ${marketId} is active`).to.be.false;
            expect(market.winnerIndex, `market ${marketId} is ${won ? "YES" : "NO"}`).to.equal(winnerIndex);
          }

          const invalidMarket = await marketFactory.getMarket(group.invalidMarket);
          expect(invalidMarket.active, `market ${group.invalidMarket} is active`).to.be.false;
          expect(invalidMarket.winnerIndex, `market ${group.invalidMarket} is YES`).to.equal(OUTCOME_NO);
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
              m(validGroup.invalid.marketId, OUTCOME_NO),
              m(validGroup.teams[0].marketId, OUTCOME_NO),
              m(validGroup.teams[1].marketId, OUTCOME_YES),
              m(validGroup.teams[2].marketId, OUTCOME_NO),
              m(validGroup.teams[3].marketId, OUTCOME_NO),
              m(validGroup.teams[4].marketId, OUTCOME_NO),
            ])
          );
        });

        describe("finalize resolution", () => {
          beforeEach("finalizeGroup", async () => {
            await marketFactory.finalizeGroup(validGroup.id);
          });

          it("group is finalized", async () => {
            const group = await marketFactory.getGroup(validGroup.id);
            expect(group.status, "group is final").to.equal(GroupStatus.Final);
          });

          it("log GroupResolved for the valid group", async () => {
            const filter = marketFactory.filters.GroupResolved(null, null);
            const logs = (await marketFactory.queryFilter(filter)).map(({ args }) => ({
              id: args.id,
              valid: args.valid,
            }));
            expect(logs).to.deep.equal([{ id: validGroup.id, valid: true }]);
          });
        });
      });
    });

    describe("fetching", () => {
      beforeEach("initialize second group", async () => {
        await initializeGroup(secondGroup, marketFactory);
      });

      let fetcher: GroupFetcher;
      beforeEach("fetcher", async () => {
        fetcher = (await ethers.getContract("FuturesFetcher")) as FuturesFetcher;
      });

      it("fetcher deployed correctly", async () => {
        expect(await fetcher.marketType()).to.equal("Futures");
        expect(await fetcher.version()).to.be.a("string");
      });

      [
        { offset: 0, bundle: 50, ids: [secondGroup.id, validGroup.id] },
        { offset: 1, bundle: 50, ids: [validGroup.id] },
        { offset: 0, bundle: 1, ids: [secondGroup.id, validGroup.id] },
        { offset: 3, bundle: 50, ids: [] },
      ].forEach(({ offset, bundle, ids }) => {
        it(`fetcher initial {offset=${offset},bundle=${bundle}}`, async () => {
          const { factoryBundle, markets } = await fetchInitialGroup(
            fetcher,
            marketFactory,
            ammFactory,
            masterChef,
            offset,
            bundle
          );
          expect(factoryBundle, "factory bundle").to.deep.equal(await marketFactoryBundleCheck(marketFactory));

          expect(markets, "market bundles").to.deep.equal(
            flatten(
              ...(await Promise.all(
                ids.map((groupId) => groupStaticBundleCheck(marketFactory, ammFactory, masterChef, groupId))
              ))
            )
          );
        });

        it(`fetcher dynamic {offset=${offset},bundle=${bundle}}`, async () => {
          const { markets } = await fetchDynamicGroup(fetcher, marketFactory, ammFactory, offset, bundle);

          expect(markets, "market bundles").to.deep.equal(
            flatten(
              ...(await Promise.all(ids.map((groupId) => groupDynamicBundleCheck(marketFactory, ammFactory, groupId))))
            )
          );
        });
      });
    });
  });

  describe("invalid group", () => {
    beforeEach("create and resolve group", async () => {
      await initializeGroup(invalidGroup, marketFactory);
      await marketFactory.beginResolvingGroup(invalidGroup.id, invalidGroup.winningMarketIndex);
      await resolveMarkets(invalidGroup, marketFactory);
      await marketFactory.finalizeGroup(invalidGroup.id);
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
          // now the ones for the invalid group
          m(invalidGroup.invalid.marketId, OUTCOME_YES),
          m(invalidGroup.teams[0].marketId, OUTCOME_NO),
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
      const logs = (await marketFactory.queryFilter(filter)).map(({ args }) => ({ id: args.id, valid: args.valid }));
      expect(logs).to.deep.equal([{ id: invalidGroup.id, valid: false }]);
    });
  });
});

enum GroupStatus {
  Unknown = 0,
  Scheduled,
  Finalizing,
  Final,
  Invalid,
}

const OUTCOME_NO = 0;
const OUTCOME_YES = 1;
const ODDS = ratioOdds([1, 5]);

function ratioOdds(proportions: BigNumberish[]) {
  const MAX_BPOOL_WEIGHT = BigNumber.from(10).pow(18).mul(50);
  const total = proportions.reduce((t: BigNumber, b: BigNumberish) => t.add(b), BigNumber.from(0));
  return proportions.map((p) => MAX_BPOOL_WEIGHT.mul(p).div(total));
}

function buildOutcomeNames(marketName: string): string[] {
  return [`NO - ${marketName}`, `YES - ${marketName}`];
}

export async function groupStaticBundleCheck(
  marketFactory: Grouped,
  ammFactory: AMMFactory,
  masterChef: MasterChef,
  groupId: BigNumberish
): Promise<InitialGroupsMarket[]> {
  const group = await marketFactory.getGroup(groupId);

  async function marketCheck(marketId: BigNumberish, marketName: string, marketType: GroupMarketType) {
    const market = await marketFactory.getMarket(marketId);
    const rewards = await masterChef.getPoolInfo(ammFactory.address, marketFactory.address, marketId);
    return {
      // specific to this market
      factory: marketFactory.address,
      marketId,
      pool: await makePoolCheck(ammFactory, marketFactory, marketId),
      shareTokens: market.shareTokens,
      creationTimestamp: market.creationTimestamp,
      winner: market.winner,
      initialOdds: market.initialOdds,

      groupId,
      groupName: group.name,
      groupStatus: group.status,
      endTime: group.endTime,
      marketName,
      marketType,
      category: group.category,
      rewards: createPoolStatusInfo(rewards),
    };
  }

  return [
    ...(await Promise.all(
      group.markets.map(
        async (marketId: BigNumberish, index): Promise<InitialGroupsMarket> =>
          marketCheck(marketId, group.marketNames[index], GroupMarketType.Regular)
      )
    )),
    await marketCheck(group.invalidMarket, group.invalidMarketName, GroupMarketType.Invalid),
  ];
}

export async function groupDynamicBundleCheck(
  marketFactory: Grouped,
  ammFactory: AMMFactory,
  groupId: BigNumberish
): Promise<DynamicGroupsMarket[]> {
  const group = await marketFactory.getGroup(groupId);

  async function marketCheck(marketId: BigNumberish) {
    const market = await marketFactory.getMarket(marketId);
    return {
      // specific to this market
      factory: marketFactory.address,
      marketId,
      pool: await makePoolCheck(ammFactory, marketFactory, marketId),
      winner: market.winner,

      // from the group
      groupId,
      groupStatus: group.status,
    };
  }

  return [...(await Promise.all([...group.markets, group.invalidMarket].map(marketCheck)))];
}

async function initializeGroup(groupSpec: GroupSpec, marketFactory: FuturesMarketFactoryV3) {
  await marketFactory.initializeGroup(
    groupSpec.id,
    groupSpec.name,
    groupSpec.invalid.name,
    groupSpec.endTime,
    groupSpec.category
  );

  for (const team of groupSpec.teams) {
    await marketFactory.addOutcomesToGroup(groupSpec.id, [team.name], [ODDS]);
  }
}

async function resolveMarkets(groupSpec: GroupSpec, marketFactory: FuturesMarketFactoryV3) {
  const group = await marketFactory.getGroup(groupSpec.id);

  const maxIndex = group.markets.length; // technically max+1, but the math works out
  const halfIndex = Math.floor(maxIndex / 2);
  const indexBundles = [range(0, halfIndex), range(halfIndex, maxIndex)];

  for (const marketIndexes of indexBundles) {
    await marketFactory.resolveMarkets(groupSpec.id, marketIndexes);
  }
}
