import { deployments, ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { expect } from "chai";

import { Cash, MMALinkMarketFactory, OwnedERC20__factory } from "../typechain";
import { BigNumber } from "ethers";
import { MMAWhoWon, SportsLinkEventStatus } from "../src";

describe("MMA Factory", () => {
  let signer: SignerWithAddress;

  const now = BigNumber.from(Date.now()).div(1000);
  const estimatedStartTime = now.add(60 * 60 * 24); // one day

  const eventId = 9001;
  const homeFighterName = "Rascal McJupiter";
  const homeFighterId = 42;
  const awayFighterName = "Doja Cat";
  const awayFighterId = 1881;
  const moneylineHome = -600;
  const moneylineAway = 800;

  let collateral: Cash;
  let marketFactory: MMALinkMarketFactory;
  let headToHeadMarketId: BigNumber;

  beforeEach(async () => {
    await deployments.fixture();

    [signer] = await ethers.getSigners();

    marketFactory = (await ethers.getContract("MMALinkMarketFactory")) as MMALinkMarketFactory;
    collateral = (await ethers.getContract("Collateral")) as Cash;

    await marketFactory.createMarket(
      eventId,
      homeFighterName,
      homeFighterId,
      awayFighterName,
      awayFighterId,
      estimatedStartTime,
      [moneylineHome, moneylineAway]
    );

    const filter = marketFactory.filters.MarketCreated(null, null, null, null, eventId, null, null, null, null, null);
    const logs = await marketFactory.queryFilter(filter);
    expect(logs.length).to.equal(1);
    const [headToHeadLog] = logs.map((log) => log.args);

    [headToHeadMarketId] = headToHeadLog;
  });

  it("is deployable", async () => {
    expect(await marketFactory.getOwner()).to.equal(signer.address);
    expect(await marketFactory.collateral()).to.equal(collateral.address);
  });

  it("can create markets", async () => {
    expect(headToHeadMarketId).to.equal(1);
  });

  it("head to head market is correct", async () => {
    const headToHeadMarket = await marketFactory.getMarket(headToHeadMarketId);
    const [noContest, away, home] = headToHeadMarket.shareTokens.map((addr) =>
      OwnedERC20__factory.connect(addr, signer)
    );
    expect(await noContest.symbol()).to.equal("No Contest");
    expect(await noContest.name()).to.equal("No Contest");
    expect(await away.symbol()).to.equal(awayFighterName);
    expect(await away.name()).to.equal(awayFighterName);
    expect(await home.symbol()).to.equal(homeFighterName);
    expect(await home.name()).to.equal(homeFighterName);
  });

  it("lists resolvable events", async () => {
    const events = await marketFactory.listResolvableEvents();
    expect(events.length).to.equal(1);
    expect(Number(events[0])).to.equal(eventId);
  });

  describe("resolved market", () => {
    beforeEach(async () => {
      await marketFactory.trustedResolveMarkets(
        eventId,
        SportsLinkEventStatus.Final,
        homeFighterId,
        awayFighterId,
        MMAWhoWon.Home
      );
    });

    it("can resolve markets", async () => {
      const headToHeadMarket = await marketFactory.getMarket(headToHeadMarketId);
      expect(headToHeadMarket.winner).to.equal(headToHeadMarket.shareTokens[2]); // home team won
    });

    it("stops listing resolved events", async () => {
      const events = await marketFactory.listResolvableEvents();
      expect(events.length).to.equal(0);
    });
  });

  it("the Away fighter can win", async () => {
    const thisEventId = eventId + 1; // just has to be different
    await marketFactory.createMarket(
      thisEventId,
      homeFighterName,
      homeFighterId,
      awayFighterName,
      awayFighterId,
      estimatedStartTime,
      [moneylineHome, moneylineAway]
    );
    const [marketId] = (await marketFactory.getEvent(thisEventId)).markets;
    await marketFactory.trustedResolveMarkets(
      thisEventId,
      SportsLinkEventStatus.Final,
      homeFighterId,
      awayFighterId,
      MMAWhoWon.Away
    );
    const headToHeadMarket = await marketFactory.getMarket(marketId);
    expect(headToHeadMarket.winner).to.equal(headToHeadMarket.shareTokens[1]); // away team won
  });

  it("draws can happen", async () => {
    const thisEventId = eventId + 1; // just has to be different
    await marketFactory.createMarket(
      thisEventId,
      homeFighterName,
      homeFighterId,
      awayFighterName,
      awayFighterId,
      estimatedStartTime,
      [moneylineHome, moneylineAway]
    );
    const [marketId] = (await marketFactory.getEvent(thisEventId)).markets;
    await marketFactory.trustedResolveMarkets(
      thisEventId,
      SportsLinkEventStatus.Final,
      homeFighterId,
      awayFighterId,
      MMAWhoWon.Draw
    );
    const headToHeadMarket = await marketFactory.getMarket(marketId);
    expect(headToHeadMarket.winner).to.equal(headToHeadMarket.shareTokens[0]); // draw
  });

  it("getters", async () => {
    const { markets, homeFighterId, awayFighterId, startTime, eventStatus } = await marketFactory.getEvent(eventId);
    expect(markets.length).to.equal(1);
    expect(homeFighterId).to.equal(homeFighterId);
    expect(awayFighterId).to.equal(awayFighterId);
    expect(startTime).to.equal(startTime);
    expect(eventStatus).to.equal(1); // Final
  });

  describe("LinkFactory NoContest", () => {
    before(async () => {
      const now = BigNumber.from(Date.now()).div(1000);
      const estimatedStartTime = now.add(60 * 60 * 24); // one day
      const homeFighterId = 42;
      const awayFighterId = 1881;

      await marketFactory.createMarket(
        eventId,
        homeFighterName,
        homeFighterId,
        awayFighterName,
        awayFighterId,
        estimatedStartTime,
        [moneylineHome, moneylineAway]
      );
    });

    it("can resolve markets as No Contest", async () => {
      await marketFactory.trustedResolveMarkets(eventId, SportsLinkEventStatus.Postponed, 0, 0, MMAWhoWon.Away);

      const headToHeadMarketId = 1;

      const headToHeadMarket = await marketFactory.getMarket(headToHeadMarketId);
      expect(headToHeadMarket.winner, "head to head winner").to.equal(headToHeadMarket.shareTokens[0]); // No Contest
    });
  });
});
