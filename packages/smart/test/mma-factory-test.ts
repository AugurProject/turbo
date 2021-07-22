import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { expect } from "chai";

import {
  Cash,
  Cash__factory,
  FeePot__factory,
  MMAMarketFactory,
  MMAMarketFactory__factory,
  OwnedERC20__factory,
} from "../typechain";
import { BigNumber } from "ethers";
import { calcShareFactor, MMAWhoWon, SportsLinkEventStatus } from "../src";

describe("MMA Factory", () => {
  let signer: SignerWithAddress;

  before(async () => {
    [signer] = await ethers.getSigners();
  });

  const eventId = 9001;
  const homeTeamName = "Rascal McJupiter";
  const homeTeamId = 42;
  const awayTeamName = "Doja Cat";
  const awayTeamId = 1881;
  const moneylineHome = -600;
  const moneylineAway = 800;

  const now = BigNumber.from(Date.now()).div(1000);
  const estimatedStartTime = now.add(60 * 60 * 24); // one day

  let collateral: Cash;
  let marketFactory: MMAMarketFactory;
  let headToHeadMarketId: BigNumber;

  it("is deployable", async () => {
    collateral = await new Cash__factory(signer).deploy("USDC", "USDC", 6); // 6 decimals to mimic USDC
    const reputationToken = await new Cash__factory(signer).deploy("REPv2", "REPv2", 18);
    const feePot = await new FeePot__factory(signer).deploy(collateral.address, reputationToken.address);
    const smallFee = BigNumber.from(10).pow(16);
    const shareFactor = calcShareFactor(await collateral.decimals());
    marketFactory = await new MMAMarketFactory__factory(signer).deploy(
      signer.address,
      collateral.address,
      shareFactor,
      feePot.address,
      [smallFee, smallFee, smallFee],
      signer.address,
      signer.address // pretending the deployer is a link node for testing purposes
    );

    expect(await marketFactory.getOwner()).to.equal(signer.address);
    expect(await marketFactory.feePot()).to.equal(feePot.address);
    expect(await marketFactory.collateral()).to.equal(collateral.address);
  });

  it("can create markets", async () => {
    await marketFactory.createMarket(eventId, homeTeamName, homeTeamId, awayTeamName, awayTeamId, estimatedStartTime, [
      moneylineHome,
      moneylineAway,
    ]);

    const filter = marketFactory.filters.MarketCreated(null, null, null);
    const logs = await marketFactory.queryFilter(filter);
    expect(logs.length).to.equal(1);
    const [headToHeadLog] = logs.map((log) => log.args);

    [headToHeadMarketId] = headToHeadLog;

    expect(headToHeadMarketId).to.equal(1);
  });

  it("head to head market is correct", async () => {
    const headToHeadMarket = await marketFactory.getMarket(headToHeadMarketId);
    const [noContest, away, home] = headToHeadMarket.shareTokens.map((addr) =>
      OwnedERC20__factory.connect(addr, signer)
    );
    expect(await noContest.symbol()).to.equal("No Contest / Draw");
    expect(await noContest.name()).to.equal("No Contest / Draw");
    expect(await away.symbol()).to.equal(awayTeamName);
    expect(await away.name()).to.equal(awayTeamName);
    expect(await home.symbol()).to.equal(homeTeamName);
    expect(await home.name()).to.equal(homeTeamName);
  });

  it("lists resolvable events", async () => {
    const events = await marketFactory.listResolvableEvents();
    expect(events.length).to.equal(1);
    expect(Number(events[0])).to.equal(eventId);
  });

  it("can resolve markets", async () => {
    await marketFactory.resolveEvent(eventId, SportsLinkEventStatus.Final, homeTeamId, awayTeamId, MMAWhoWon.Home);

    const headToHeadMarket = await marketFactory.getMarket(headToHeadMarketId);
    expect(headToHeadMarket.winner).to.equal(headToHeadMarket.shareTokens[2]); // home team won
  });

  it("stops listing resolved events", async () => {
    const events = await marketFactory.listResolvableEvents();
    expect(events.length).to.equal(0);
  });

  it("the Away Team can win", async () => {
    const thisEventId = eventId + 1; // just has to be different
    await marketFactory.createMarket(
      thisEventId,
      homeTeamName,
      homeTeamId,
      awayTeamName,
      awayTeamId,
      estimatedStartTime,
      [moneylineHome, moneylineAway]
    );
    const [marketId] = (await marketFactory.getSportsEvent(thisEventId)).markets;
    await marketFactory.resolveEvent(thisEventId, SportsLinkEventStatus.Final, homeTeamId, awayTeamId, MMAWhoWon.Away);
    const headToHeadMarket = await marketFactory.getMarket(marketId);
    expect(headToHeadMarket.winner).to.equal(headToHeadMarket.shareTokens[1]); // away team won
  });

  it("draws can happen", async () => {
    const thisEventId = eventId + 2; // just has to be different
    await marketFactory.createMarket(
      thisEventId,
      homeTeamName,
      homeTeamId,
      awayTeamName,
      awayTeamId,
      estimatedStartTime,
      [moneylineHome, moneylineAway]
    );
    const [marketId] = (await marketFactory.getSportsEvent(thisEventId)).markets;
    await marketFactory.resolveEvent(thisEventId, SportsLinkEventStatus.Final, homeTeamId, awayTeamId, MMAWhoWon.Draw);
    const headToHeadMarket = await marketFactory.getMarket(marketId);
    expect(headToHeadMarket.winner).to.equal(headToHeadMarket.shareTokens[0]); // draw
  });

  it("getters", async () => {
    const { markets, homeTeamId, awayTeamId, estimatedStartTime, status } = await marketFactory.getSportsEvent(eventId);
    expect(markets.length).to.equal(1);
    expect(homeTeamId).to.equal(homeTeamId);
    expect(awayTeamId).to.equal(awayTeamId);
    expect(estimatedStartTime).to.equal(estimatedStartTime);
    expect(status).to.equal(2); // Final
  });

  describe("LinkFactory NoContest", () => {
    let signer: SignerWithAddress;

    before(async () => {
      [signer] = await ethers.getSigners();
    });

    const eventId = 9001;

    let marketFactory: MMAMarketFactory;

    before(async () => {
      const collateral = await new Cash__factory(signer).deploy("USDC", "USDC", 6); // 6 decimals to mimic USDC
      const reputationToken = await new Cash__factory(signer).deploy("REPv2", "REPv2", 18);
      const feePot = await new FeePot__factory(signer).deploy(collateral.address, reputationToken.address);
      const smallFee = BigNumber.from(10).pow(16);
      const shareFactor = calcShareFactor(await collateral.decimals());

      const now = BigNumber.from(Date.now()).div(1000);
      const estimatedStartTime = now.add(60 * 60 * 24); // one day
      const homeTeamId = 42;
      const awayTeamId = 1881;

      marketFactory = await new MMAMarketFactory__factory(signer).deploy(
        signer.address,
        collateral.address,
        shareFactor,
        feePot.address,
        [smallFee, smallFee, smallFee],
        signer.address,
        signer.address // pretending the deployer is a link node for testing purposes
      );

      await marketFactory.createMarket(
        eventId,
        homeTeamName,
        homeTeamId,
        awayTeamName,
        awayTeamId,
        estimatedStartTime,
        [moneylineHome, moneylineAway]
      );
    });

    it("can resolve markets as No Contest", async () => {
      await marketFactory.resolveEvent(eventId, SportsLinkEventStatus.Postponed, 0, 0, MMAWhoWon.Away);

      const headToHeadMarketId = 1;

      const headToHeadMarket = await marketFactory.getMarket(headToHeadMarketId);
      expect(headToHeadMarket.winner, "head to head winner").to.equal(headToHeadMarket.shareTokens[0]); // No Contest
    });
  });
});
