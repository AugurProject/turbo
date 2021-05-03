import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { expect } from "chai";

import {
  Cash,
  Cash__factory,
  FeePot__factory,
  SportsLinkMarketFactory,
  SportsLinkMarketFactory__factory,
  OwnedERC20__factory,
} from "../typechain";
import { BigNumber } from "ethers";
import { calcShareFactor, SportsLinkEventStatus } from "../src";

describe("LinkFactory", () => {
  let signer: SignerWithAddress;

  before(async () => {
    [signer] = await ethers.getSigners();
  });

  const eventId = 9001;
  const homeTeamId = 42;
  const awayTeamId = 1881;
  const homeSpread = 4;
  const overUnderTotal = 13;
  const sportId = 4;

  const now = BigNumber.from(Date.now()).div(1000);
  const estimatedStartTime = now.add(60 * 60 * 24); // one day

  let collateral: Cash;
  let marketFactory: SportsLinkMarketFactory;
  let headToHeadMarketId: BigNumber;
  let spreadMarketId: BigNumber;
  let overUnderMarketId: BigNumber;

  it("is deployable", async () => {
    collateral = await new Cash__factory(signer).deploy("USDC", "USDC", 6); // 6 decimals to mimic USDC
    const reputationToken = await new Cash__factory(signer).deploy("REPv2", "REPv2", 18);
    const feePot = await new FeePot__factory(signer).deploy(collateral.address, reputationToken.address);
    const smallFee = BigNumber.from(10).pow(16);
    const shareFactor = calcShareFactor(await collateral.decimals());
    marketFactory = await new SportsLinkMarketFactory__factory(signer).deploy(
      signer.address,
      collateral.address,
      shareFactor,
      feePot.address,
      smallFee,
      smallFee,
      signer.address,
      smallFee,
      signer.address, // pretending the deployer is a link node for testing purposes
      sportId
    );

    expect(await marketFactory.getOwner()).to.equal(signer.address);
    expect(await marketFactory.feePot()).to.equal(feePot.address);
    expect(await marketFactory.collateral()).to.equal(collateral.address);
  });

  it("can create markets", async () => {
    await marketFactory.createMarket(
      await marketFactory.encodeCreation(
        eventId,
        homeTeamId,
        awayTeamId,
        estimatedStartTime,
        homeSpread,
        overUnderTotal
      )
    );

    const filter = marketFactory.filters.MarketCreated(null, null, null, null, eventId, null, null, null, null);
    const logs = await marketFactory.queryFilter(filter);
    expect(logs.length).to.equal(3);
    const [headToHeadLog, spreadLog, overUnderLog] = logs.map((log) => log.args);

    [headToHeadMarketId] = headToHeadLog;
    [spreadMarketId] = spreadLog;
    [overUnderMarketId] = overUnderLog;

    expect(headToHeadMarketId).to.equal(0);
    expect(spreadMarketId).to.equal(1);
    expect(overUnderMarketId).to.equal(2);
  });

  it("head to head market is correct", async () => {
    const headToHeadMarket = await marketFactory.getMarket(headToHeadMarketId);
    const [noContest, away, home] = headToHeadMarket.shareTokens.map((addr) =>
      OwnedERC20__factory.connect(addr, signer)
    );
    expect(await noContest.symbol()).to.equal("No Contest");
    expect(await noContest.name()).to.equal("No Contest");
    expect(await away.symbol()).to.equal("Away");
    expect(await away.name()).to.equal("Away");
    expect(await home.symbol()).to.equal("Home");
    expect(await home.name()).to.equal("Home");
  });

  it("spread market is correct", async () => {
    const spreadMarket = await marketFactory.getMarket(spreadMarketId);
    const [noContest, away, home] = spreadMarket.shareTokens.map((addr) => OwnedERC20__factory.connect(addr, signer));
    expect(await noContest.symbol()).to.equal("No Contest");
    expect(await noContest.name()).to.equal("No Contest");
    expect(await away.symbol()).to.equal("Away");
    expect(await away.name()).to.equal("Away");
    expect(await home.symbol()).to.equal("Home");
    expect(await home.name()).to.equal("Home");
  });

  it("over under market is correct", async () => {
    const overUnderMarket = await marketFactory.getMarket(overUnderMarketId);
    const [noContest, over, under] = overUnderMarket.shareTokens.map((addr) =>
      OwnedERC20__factory.connect(addr, signer)
    );
    expect(await noContest.symbol()).to.equal("No Contest");
    expect(await noContest.name()).to.equal("No Contest");
    expect(await under.symbol()).to.equal("Under");
    expect(await under.name()).to.equal("Under");
    expect(await over.symbol()).to.equal("Over");
    expect(await over.name()).to.equal("Over");
  });

  it("can resolve markets", async () => {
    await marketFactory.trustedResolveMarkets(
      await marketFactory.encodeResolution(eventId, SportsLinkEventStatus.Final, 10, 2)
    );

    const headToHeadMarket = await marketFactory.getMarket(headToHeadMarketId);
    expect(headToHeadMarket.winner).to.equal(headToHeadMarket.shareTokens[2]);

    const spreadMarket = await marketFactory.getMarket(spreadMarketId);
    expect(spreadMarket.winner).to.equal(spreadMarket.shareTokens[2]);

    const overUnderMarket = await marketFactory.getMarket(overUnderMarketId);
    expect(overUnderMarket.winner).to.equal(overUnderMarket.shareTokens[1]);
  });

  it("encodes and decodes market creation payload", async () => {
    const fakeStartTime = 1619743497;
    const payload = await marketFactory.encodeCreation(
      eventId,
      homeTeamId,
      awayTeamId,
      fakeStartTime,
      homeSpread,
      overUnderTotal
    );
    expect(payload).to.equal("0x00000000000000000000000000002329002a0759608b53090004000d00000000");

    const decoded = await marketFactory.decodeCreation(payload);
    expect(decoded._eventId, "_eventId").to.equal(eventId);
    expect(decoded._homeTeamId, "_homeTeamId").to.equal(homeTeamId);
    expect(decoded._awayTeamId, "_awayTeamId").to.equal(awayTeamId);
    expect(decoded._startTimestamp, "_startTimestamp").to.equal(fakeStartTime);
    expect(decoded._homeSpread, "_homeSpread").to.equal(homeSpread);
    expect(decoded._totalScore, "_totalScore").to.equal(overUnderTotal);
  });

  it("encodes and decodes market resolution payload", async () => {
    const eventStatus = 2;
    const homeScore = 12;
    const awayScore = 4810;
    const payload = await marketFactory.encodeResolution(eventId, eventStatus, homeScore, awayScore);
    expect(payload).to.equal("0x0000000000000000000000000000232902000c12ca0000000000000000000000");

    const decoded = await marketFactory.decodeResolution(payload);
    expect(decoded._eventId, "_eventId").to.equal(eventId);
    expect(decoded._eventStatus, "_eventStatus").to.equal(eventStatus);
    expect(decoded._homeScore, "_homeScore").to.equal(homeScore);
    expect(decoded._awayScore, "_awayScore").to.equal(awayScore);
  });
});
