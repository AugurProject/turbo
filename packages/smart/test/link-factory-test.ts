import { ethers, network } from "hardhat";
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
  const homeSpread = 40;
  const overUnderTotal = 60;
  const resolutionBuffer = 1000; // must be largish to overcome actual passage of time for negative tests

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
      resolutionBuffer
    );

    expect(await marketFactory.getOwner()).to.equal(signer.address);
    expect(await marketFactory.feePot()).to.equal(feePot.address);
    expect(await marketFactory.collateral()).to.equal(collateral.address);
  });

  it("can create markets", async () => {
    await marketFactory.createEvent(
      eventId,
      homeTeamId,
      awayTeamId,
      estimatedStartTime,
      homeSpread,
      overUnderTotal,
      true,
      true
    );

    const filter = marketFactory.filters.MarketCreated(null, null, null, null, eventId, null, null, null, null);
    const logs = await marketFactory.queryFilter(filter);
    expect(logs.length).to.equal(3);
    const [headToHeadLog, spreadLog, overUnderLog] = logs.map((log) => log.args);

    [headToHeadMarketId] = headToHeadLog;
    [spreadMarketId] = spreadLog;
    [overUnderMarketId] = overUnderLog;

    expect(headToHeadMarketId).to.equal(1);
    expect(spreadMarketId).to.equal(2);
    expect(overUnderMarketId).to.equal(3);
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

    const details = await marketFactory.getMarketDetails(spreadMarketId);
    expect(details.value0).to.equal(homeSpread + 5); // add 5 to avoid a round number
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

    const details = await marketFactory.getMarketDetails(overUnderMarketId);
    expect(details.value0).to.equal(overUnderTotal + 5);
  });

  it("can list unresolved markets", async () => {
    const unresolvedMarkets = await marketFactory.listUnresolvedMarkets();
    expect(unresolvedMarkets).to.eql([headToHeadMarketId, spreadMarketId, overUnderMarketId]);
  });

  it("can list resolvable events", async () => {
    const unresolvedEvents = await marketFactory.listResolvableEvents();
    expect(unresolvedEvents).to.eql([BigNumber.from(eventId)]);
  });

  it("can resolve markets", async () => {
    const resolveMarkets = async () => {
      return marketFactory.resolveEvent(eventId, SportsLinkEventStatus.Final, 100, 20, estimatedStartTime);
    };

    // set initial resolution time and scores
    await resolveMarkets();

    it("resolved but not finalizable events are not listed", async () => {
      const unresolvedEvents = await marketFactory.listResolvableEvents();
      expect(unresolvedEvents).to.eql([]);
    });

    // once without changing the block time, eliciting failure due to resolutionBuffer
    await expect(resolveMarkets()).to.be.revertedWith(
      "VM Exception while processing transaction: revert Cannot finalize market resolution until resolutionBuffer time has passed"
    );

    // change block time to meet the resolutionBuffer constraint
    await network.provider.send("evm_increaseTime", [resolutionBuffer]);

    it("finalizable events are listed", async () => {
      const unresolvedEvents = await marketFactory.listResolvableEvents();
      expect(unresolvedEvents).to.eql([BigNumber.from(eventId)]);
    });

    // again to finalize
    await resolveMarkets();

    const headToHeadMarket = await marketFactory.getMarket(headToHeadMarketId);
    expect(headToHeadMarket.winner).to.equal(headToHeadMarket.shareTokens[2]); // home team won

    const spreadMarket = await marketFactory.getMarket(spreadMarketId);
    expect(spreadMarket.winner).to.equal(spreadMarket.shareTokens[2]); // home spread greater

    const overUnderMarket = await marketFactory.getMarket(overUnderMarketId);
    expect(overUnderMarket.winner).to.equal(overUnderMarket.shareTokens[1]); // over
  });

  it("can see that the list of unresolved markets excludes resolved markets", async () => {
    const unresolvedMarkets = await marketFactory.listUnresolvedMarkets();
    expect(unresolvedMarkets).to.eql([]);
  });

  it("can see that the list resolvable events excludes resolved events", async () => {
    const unresolvedEvents = await marketFactory.listResolvableEvents();
    expect(unresolvedEvents).to.eql([]);
  });
});

describe("LinkFactory NoContest", () => {
  let signer: SignerWithAddress;

  before(async () => {
    [signer] = await ethers.getSigners();
  });

  const resolutionBuffer = 1000; // must be largish to overcome actual passage of time for negative tests
  const eventId = 9001;
  const now = BigNumber.from(Date.now()).div(1000);
  const estimatedStartTime = now.add(60 * 60 * 24); // one day

  let marketFactory: SportsLinkMarketFactory;

  before(async () => {
    const collateral = await new Cash__factory(signer).deploy("USDC", "USDC", 6); // 6 decimals to mimic USDC
    const reputationToken = await new Cash__factory(signer).deploy("REPv2", "REPv2", 18);
    const feePot = await new FeePot__factory(signer).deploy(collateral.address, reputationToken.address);
    const smallFee = BigNumber.from(10).pow(16);
    const shareFactor = calcShareFactor(await collateral.decimals());

    const homeTeamId = 42;
    const awayTeamId = 1881;
    const homeSpread = 40;
    const overUnderTotal = 60;
    const sportId = 4;

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

    await marketFactory.createEvent(
      eventId,
      homeTeamId,
      awayTeamId,
      estimatedStartTime,
      homeSpread,
      overUnderTotal,
      true,
      true
    );
  });

  it("can resolve markets as No Contest", async () => {
    await marketFactory.resolveEvent(eventId, SportsLinkEventStatus.Postpones, 0, 0, estimatedStartTime);
    await network.provider.send("evm_increaseTime", [resolutionBuffer]);
    await marketFactory.resolveEvent(eventId, SportsLinkEventStatus.Postpones, 0, 0, estimatedStartTime);

    const headToHeadMarketId = 1;
    const spreadMarketId = 2;
    const overUnderMarketId = 3;

    const headToHeadMarket = await marketFactory.getMarket(headToHeadMarketId);
    expect(headToHeadMarket.winner).to.equal(headToHeadMarket.shareTokens[0]); // No Contest

    const spreadMarket = await marketFactory.getMarket(spreadMarketId);
    expect(spreadMarket.winner).to.equal(spreadMarket.shareTokens[0]); // No Contest

    const overUnderMarket = await marketFactory.getMarket(overUnderMarketId);
    expect(overUnderMarket.winner).to.equal(overUnderMarket.shareTokens[0]); // No Contest
  });
});
