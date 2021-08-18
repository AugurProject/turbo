import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { expect } from "chai";

import {
  AMMFactory,
  AMMFactory__factory,
  BFactory__factory,
  Cash,
  Cash__factory,
  FeePot,
  FeePot__factory,
  MMAMarketFactory,
  NFLFetcher,
  NFLFetcher__factory,
  NFLMarketFactory,
  NFLMarketFactory__factory,
  OwnedERC20__factory,
} from "../typechain";
import { BigNumber, BigNumberish } from "ethers";
import {
  calcShareFactor,
  NULL_ADDRESS,
  SportsLinkEventStatus,
  createSportsMarketFactoryBundle,
  createStaticSportsEventBundle,
  createDynamicSportsEventBundle,
} from "../src";

const INITIAL_TOTAL_SUPPLY_OF_BPOOL = BigNumber.from(10).pow(20);
const ZERO = BigNumber.from(0);
const BASIS = BigNumber.from(10).pow(18);
enum Market {
  HeadToHead = 0,
  Spread = 1,
  OverUnder = 2,
}
enum Outcome {
  NoContest = 0,

  AwayWon = 1,
  HomeWon = 2,

  SpreadLesser = 1,
  SpreadGreater = 2,

  TotalOver = 1,
  TotalUnder = 2,
}

describe("NFL", () => {
  let signer: SignerWithAddress;

  before(async () => {
    [signer] = await ethers.getSigners();
  });

  const eventId = 9001;
  const homeTeamId = 42;
  const awayTeamId = 1881;
  const homeTeamName = "hom";
  const awayTeamName = "awa";
  const moneylines: [number, number] = [-130, +270]; // [home,away]
  const homeSpread = 20;
  const overUnderTotal = 60;
  const smallFee = BigNumber.from(10).pow(16);

  const now = BigNumber.from(Date.now()).div(1000);
  const estimatedStartTime = now.add(60 * 60 * 24); // one day

  let collateral: Cash;
  let feePot: FeePot;
  let marketFactory: NFLMarketFactory;
  let headToHeadMarketId: BigNumber;
  let spreadMarketId: BigNumber;
  let overUnderMarketId: BigNumber;

  let shareFactor: BigNumber;

  it("is deployable", async () => {
    collateral = await new Cash__factory(signer).deploy("USDC", "USDC", 6); // 6 decimals to mimic USDC
    const reputationToken = await new Cash__factory(signer).deploy("REPv2", "REPv2", 18);
    feePot = await new FeePot__factory(signer).deploy(collateral.address, reputationToken.address);
    shareFactor = calcShareFactor(await collateral.decimals());
    marketFactory = await new NFLMarketFactory__factory(signer).deploy(
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
    expect(await marketFactory.settlementFee()).to.equal(smallFee);
    expect(await marketFactory.stakerFee()).to.equal(smallFee);
    expect(await marketFactory.protocolFee()).to.equal(smallFee);
  });

  it("can create markets", async () => {
    await marketFactory.createEvent(
      eventId,
      homeTeamName,
      homeTeamId,
      awayTeamName,
      awayTeamId,
      estimatedStartTime,
      homeSpread,
      overUnderTotal,
      moneylines
    );

    const filter = marketFactory.filters.MarketCreated(null, null, null);
    const logs = await marketFactory.queryFilter(filter);
    expect(logs.length, "market created logs length").to.equal(3);
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
    expect(await noContest.symbol()).to.equal("No Contest / Draw");
    expect(await noContest.name()).to.equal("No Contest / Draw");
    expect(await away.symbol()).to.equal(awayTeamName);
    expect(await away.name()).to.equal(awayTeamName);
    expect(await home.symbol()).to.equal(homeTeamName);
    expect(await home.name()).to.equal(homeTeamName);
  });

  it("spread market is correct", async () => {
    const spreadMarket = await marketFactory.getMarket(spreadMarketId);
    const [noContest, away, home] = spreadMarket.shareTokens.map((addr) => OwnedERC20__factory.connect(addr, signer));
    expect(await noContest.symbol()).to.equal("No Contest");
    expect(await noContest.name()).to.equal("No Contest");
    expect(await away.symbol()).to.equal(awayTeamName);
    expect(await away.name()).to.equal(awayTeamName);
    expect(await home.symbol()).to.equal(homeTeamName);
    expect(await home.name()).to.equal(homeTeamName);
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

  it("event is correct", async () => {
    const sportsEvent = await marketFactory.getSportsEvent(eventId);
    expect(sportsEvent.status, "status").to.equal(SportsLinkEventStatus.Scheduled);
    expect(sportsEvent.markets.length, "markets.length").to.equal(3);
    expect(sportsEvent.markets[Market.HeadToHead], "markets[0]").to.equal(headToHeadMarketId);
    expect(sportsEvent.markets[Market.Spread], "markets[1]").to.equal(spreadMarketId);
    expect(sportsEvent.markets[Market.OverUnder], "markets[2]").to.equal(overUnderMarketId);
    expect(sportsEvent.lines.length, "lines.length").to.equal(3);
    expect(sportsEvent.lines[Market.HeadToHead], "lines[0]").to.equal(0);
    expect(sportsEvent.lines[Market.Spread], "lines[1]").to.equal(homeSpread + 5);
    expect(sportsEvent.lines[Market.OverUnder], "lines[2]").to.equal(overUnderTotal + 5);
    expect(sportsEvent.estimatedStartTime, "estimatedStartTime").to.equal(estimatedStartTime);
    expect(sportsEvent.homeTeamId, "homeTeamId").to.equal(homeTeamId);
    expect(sportsEvent.awayTeamId, "awayTeamId").to.equal(awayTeamId);
    expect(sportsEvent.homeTeamName, "homeTeamName").to.equal(homeTeamName);
    expect(sportsEvent.awayTeamName, "awayTeamName").to.equal(awayTeamName);
    expect(sportsEvent.homeScore, "homeScore").to.equal(0);
    expect(sportsEvent.awayScore, "awayScore").to.equal(0);
  });

  it("lists resolvable events", async () => {
    const events = await marketFactory.listResolvableEvents();
    expect(events.length).to.equal(1);
    expect(Number(events[0])).to.equal(eventId);
  });

  it("can resolve markets", async () => {
    await marketFactory.resolveEvent(eventId, SportsLinkEventStatus.Final, homeTeamId, awayTeamId, 60, 30);

    const headToHeadMarket = await marketFactory.getMarket(headToHeadMarketId);
    expect(headToHeadMarket.winner).to.equal(headToHeadMarket.shareTokens[Outcome.HomeWon]);

    const spreadMarket = await marketFactory.getMarket(spreadMarketId);
    expect(spreadMarket.winner).to.equal(spreadMarket.shareTokens[Outcome.SpreadGreater]);

    const overUnderMarket = await marketFactory.getMarket(overUnderMarketId);
    expect(overUnderMarket.winner).to.equal(overUnderMarket.shareTokens[Outcome.TotalOver]);
  });

  it("stops listing resolved events", async () => {
    const events = await marketFactory.listResolvableEvents();
    expect(events.length).to.equal(0);
  });
});

describe("LinkFactory NoContest", () => {
  let signer: SignerWithAddress;

  before(async () => {
    [signer] = await ethers.getSigners();
  });

  const eventId = 9001;
  const homeTeamId = 42;
  const awayTeamId = 1881;

  let marketFactory: NFLMarketFactory;

  before(async () => {
    const collateral = await new Cash__factory(signer).deploy("USDC", "USDC", 6); // 6 decimals to mimic USDC
    const reputationToken = await new Cash__factory(signer).deploy("REPv2", "REPv2", 18);
    const feePot = await new FeePot__factory(signer).deploy(collateral.address, reputationToken.address);
    const smallFee = BigNumber.from(10).pow(16);
    const shareFactor = calcShareFactor(await collateral.decimals());

    const now = BigNumber.from(Date.now()).div(1000);
    const estimatedStartTime = now.add(60 * 60 * 24); // one day
    const moneylines: [number, number] = [-130, +270]; // [home,away]
    const homeSpread = 40;
    const overUnderTotal = 60;

    marketFactory = await new NFLMarketFactory__factory(signer).deploy(
      signer.address,
      collateral.address,
      shareFactor,
      feePot.address,
      [smallFee, smallFee, smallFee],
      signer.address,
      signer.address // pretending the deployer is a link node for testing purposes
    );

    await marketFactory.createEvent(
      eventId,
      "hi",
      homeTeamId,
      "buye",
      awayTeamId,
      estimatedStartTime,
      homeSpread,
      overUnderTotal,
      moneylines
    );
  });

  it("can resolve markets as No Contest", async () => {
    await marketFactory.resolveEvent(eventId, SportsLinkEventStatus.Postponed, homeTeamId, awayTeamId, 0, 0);

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

describe("Sports fetcher", () => {
  let signer: SignerWithAddress;

  before(async () => {
    [signer] = await ethers.getSigners();
  });

  let fetcher: NFLFetcher;
  let ammFactory: AMMFactory;
  let collateral: Cash;
  let feePot: FeePot;

  const eventId = BigNumber.from(9001);
  const homeTeamId = BigNumber.from(1881);
  const awayTeamId = BigNumber.from(40);
  const homeTeamName = "nom";
  const awayTeamName = "who?";
  const homeSpreadLine = BigNumber.from(65);
  const totalScoreLine = BigNumber.from(90);
  const smallFee = BigNumber.from(10).pow(16);
  let estimatedStartTime: BigNumber;

  let marketFactory: NFLMarketFactory;

  let h2hMarketId: BigNumberish;
  let h2hMarket: UnPromisify<ReturnType<typeof marketFactory.getMarket>>;
  let spMarketId: BigNumberish;
  let spMarket: UnPromisify<ReturnType<typeof marketFactory.getMarket>>;
  let ouMarketId: BigNumberish;
  let ouMarket: UnPromisify<ReturnType<typeof marketFactory.getMarket>>;

  before(async () => {
    collateral = await new Cash__factory(signer).deploy("USDC", "USDC", 6); // 6 decimals to mimic USDC
    const reputationToken = await new Cash__factory(signer).deploy("REPv2", "REPv2", 18);
    feePot = await new FeePot__factory(signer).deploy(collateral.address, reputationToken.address);

    const now = BigNumber.from(Date.now()).div(1000);
    estimatedStartTime = now.add(60 * 60 * 24); // one day
    marketFactory = await new NFLMarketFactory__factory(signer).deploy(
      signer.address,
      collateral.address,
      calcShareFactor(await collateral.decimals()),
      feePot.address,
      [smallFee, smallFee, smallFee],
      signer.address,
      signer.address // pretending the deployer is a link node for testing purposes
    );

    const bFactory = await new BFactory__factory(signer).deploy();
    const swapFee = smallFee;
    ammFactory = await new AMMFactory__factory(signer).deploy(bFactory.address, swapFee);

    // least interesting (earliest) event
    await marketFactory.createEvent(
      eventId.add(1),
      homeTeamName,
      homeTeamId,
      awayTeamName,
      awayTeamId,
      estimatedStartTime,
      homeSpreadLine,
      totalScoreLine,
      [+100, -110]
    );

    // most interesting (latest) event
    await marketFactory.createEvent(
      eventId,
      homeTeamName,
      homeTeamId,
      awayTeamName,
      awayTeamId,
      estimatedStartTime,
      homeSpreadLine,
      totalScoreLine,
      [+100, -110]
    );
    h2hMarketId = BigNumber.from(4);
    h2hMarket = await marketFactory.getMarket(h2hMarketId);

    spMarketId = BigNumber.from(5);
    spMarket = await marketFactory.getMarket(spMarketId);

    ouMarketId = BigNumber.from(6);
    ouMarket = await marketFactory.getMarket(ouMarketId);

    const initialLiquidity = dollars(10000);
    await collateral.approve(ammFactory.address, initialLiquidity);
    await collateral.faucet(initialLiquidity);
    await ammFactory.createPool(marketFactory.address, h2hMarketId, initialLiquidity, signer.address);
  });

  it("is deployable", async () => {
    fetcher = await new NFLFetcher__factory(signer).deploy();
    expect(await fetcher.marketType()).to.equal("NFL");
    expect(await fetcher.version()).to.be.a("string");
  });

  it("fetchInitial [0,50]", async () => {
    const offset = 0;
    const total = 50;
    const [rawFactoryBundle, rawEventBundles, lowestEventIndex] = await fetcher.fetchInitial(
      marketFactory.address,
      ammFactory.address,
      offset,
      total
    );

    expect(lowestEventIndex, "lowest event index").to.equal(0);

    const marketFactoryBundle = createSportsMarketFactoryBundle(rawFactoryBundle);
    expect(marketFactoryBundle, "market factory bundle").to.deep.equal(
      await marketFactoryBundleCheck(marketFactory, collateral, feePot)
    );

    const eventBundles = rawEventBundles.map(createStaticSportsEventBundle);
    const event = await marketFactory.getSportsEvent(eventId);

    expect(eventBundles.length, "event bundles length").to.equal(2);
    expect(eventBundles[0], "event bundles 0").to.deep.equal({
      id: eventId,
      markets: [
        {
          factory: marketFactory.address,
          marketId: h2hMarketId,
          pool: await makePoolCheck(ammFactory, marketFactory, h2hMarketId),
          shareTokens: h2hMarket.shareTokens,
          creationTimestamp: h2hMarket.creationTimestamp,
          winner: h2hMarket.winner,
          initialOdds: [
            BigNumber.from(10).pow(18),
            BigNumber.from("0x015be9b4a9bdbf11db"),
            BigNumber.from("0x014c1943b94c64ee24"),
          ],
        },
        {
          factory: marketFactory.address,
          marketId: spMarketId,
          pool: await makePoolCheck(ammFactory, marketFactory, spMarketId),
          shareTokens: spMarket.shareTokens,
          creationTimestamp: spMarket.creationTimestamp,
          winner: spMarket.winner,
          initialOdds: [BigNumber.from(10).pow(18), BASIS.mul(245).div(10), BASIS.mul(245).div(10)],
        },
        {
          factory: marketFactory.address,
          marketId: ouMarketId,
          pool: await makePoolCheck(ammFactory, marketFactory, ouMarketId),
          shareTokens: ouMarket.shareTokens,
          creationTimestamp: ouMarket.creationTimestamp,
          winner: ouMarket.winner,
          initialOdds: [BigNumber.from(10).pow(18), BASIS.mul(245).div(10), BASIS.mul(245).div(10)],
        },
      ],
      lines: [BigNumber.from(0), homeSpreadLine, totalScoreLine.add(5)],
      estimatedStartTime: event.estimatedStartTime,
      homeTeamId: event.homeTeamId,
      awayTeamId: event.awayTeamId,
      homeTeamName: event.homeTeamName,
      awayTeamName: event.awayTeamName,
      status: event.status,
      homeScore: event.homeScore,
      awayScore: event.awayScore,
    });
  });

  it("fetchInitial [0,1]", async () => {
    const offset = 0;
    const total = 1;
    const [rawFactoryBundle, rawEventBundles, lowestEventIndex] = await fetcher.fetchInitial(
      marketFactory.address,
      ammFactory.address,
      offset,
      total
    );

    expect(lowestEventIndex, "lowest event index").to.equal(1);

    const marketFactoryBundle = createSportsMarketFactoryBundle(rawFactoryBundle);
    expect(marketFactoryBundle, "market factory bundle").to.deep.equal(
      await marketFactoryBundleCheck(marketFactory, collateral, feePot)
    );

    const eventBundles = rawEventBundles.map(createStaticSportsEventBundle);
    const event = await marketFactory.getSportsEvent(eventId);

    expect(eventBundles.length, "event bundles length").to.equal(1);
    expect(eventBundles[0], "event bundles 0").to.be.deep.equal({
      id: eventId, // most interesting event
      markets: [
        {
          factory: marketFactory.address,
          marketId: h2hMarketId,
          pool: await makePoolCheck(ammFactory, marketFactory, h2hMarketId),
          shareTokens: h2hMarket.shareTokens,
          creationTimestamp: h2hMarket.creationTimestamp,
          winner: h2hMarket.winner,
          initialOdds: [
            BigNumber.from(10).pow(18),
            BigNumber.from("0x015be9b4a9bdbf11db"),
            BigNumber.from("0x014c1943b94c64ee24"),
          ],
        },
        {
          factory: marketFactory.address,
          marketId: spMarketId,
          pool: await makePoolCheck(ammFactory, marketFactory, spMarketId),
          shareTokens: spMarket.shareTokens,
          creationTimestamp: spMarket.creationTimestamp,
          winner: spMarket.winner,
          initialOdds: [BigNumber.from(10).pow(18), BASIS.mul(245).div(10), BASIS.mul(245).div(10)],
        },
        {
          factory: marketFactory.address,
          marketId: ouMarketId,
          pool: await makePoolCheck(ammFactory, marketFactory, ouMarketId),
          shareTokens: ouMarket.shareTokens,
          creationTimestamp: ouMarket.creationTimestamp,
          winner: ouMarket.winner,
          initialOdds: [BigNumber.from(10).pow(18), BASIS.mul(245).div(10), BASIS.mul(245).div(10)],
        },
      ],
      lines: [BigNumber.from(0), homeSpreadLine, totalScoreLine.add(5)],
      estimatedStartTime: event.estimatedStartTime,
      homeTeamId: event.homeTeamId,
      awayTeamId: event.awayTeamId,
      homeTeamName: event.homeTeamName,
      awayTeamName: event.awayTeamName,
      status: event.status,
      homeScore: event.homeScore,
      awayScore: event.awayScore,
    });
  });

  it("fetchInitial [1,1]", async () => {
    const offset = 1;
    const total = 1;
    const [rawFactoryBundle, rawEventBundles, lowestEventIndex] = await fetcher.fetchInitial(
      marketFactory.address,
      ammFactory.address,
      offset,
      total
    );

    expect(lowestEventIndex, "lowest event index").to.equal(0);

    const marketFactoryBundle = createSportsMarketFactoryBundle(rawFactoryBundle);
    expect(marketFactoryBundle, "market factory bundle").to.deep.equal(
      await marketFactoryBundleCheck(marketFactory, collateral, feePot)
    );

    const eventBundles = rawEventBundles.map(createStaticSportsEventBundle);

    expect(eventBundles.length, "event bundles length").to.equal(1);
    expect(eventBundles[0].id, "event bundles 0 id").to.equal(eventId.add(1)); // least interesting event
  });

  it("fetchDynamic [0,50]", async () => {
    const offset = 0;
    const total = 50;
    const [rawEventBundles, lowestEventIndex] = await fetcher.fetchDynamic(
      marketFactory.address,
      ammFactory.address,
      offset,
      total
    );

    expect(lowestEventIndex, "lowest event index").to.equal(0);

    const eventBundles = rawEventBundles.map(createDynamicSportsEventBundle);
    const event = await marketFactory.getSportsEvent(eventId);

    expect(eventBundles.length, "event bundles length").to.equal(2);
    expect(eventBundles[0], "event bundle").to.deep.equal({
      id: eventId,
      markets: [
        {
          factory: marketFactory.address,
          marketId: h2hMarketId,
          pool: await makePoolCheck(ammFactory, marketFactory, h2hMarketId),
          winner: h2hMarket.winner,
        },
        {
          factory: marketFactory.address,
          marketId: spMarketId,
          pool: await makePoolCheck(ammFactory, marketFactory, spMarketId),
          winner: spMarket.winner,
        },
        {
          factory: marketFactory.address,
          marketId: ouMarketId,
          pool: await makePoolCheck(ammFactory, marketFactory, ouMarketId),
          winner: ouMarket.winner,
        },
      ],
      status: event.status,
      homeScore: event.homeScore,
      awayScore: event.awayScore,
    });
  });

  it("fetchDynamic [0,1]", async () => {
    const offset = 0;
    const total = 1;
    const [rawEventBundles, lowestEventIndex] = await fetcher.fetchDynamic(
      marketFactory.address,
      ammFactory.address,
      offset,
      total
    );

    expect(lowestEventIndex, "lowest event index").to.equal(1);

    const eventBundles = rawEventBundles.map(createDynamicSportsEventBundle);
    const event = await marketFactory.getSportsEvent(eventId);

    expect(eventBundles.length, "event bundles length").to.equal(1);
    expect(eventBundles[0], "event bundle").to.deep.equal({
      id: eventId,
      markets: [
        {
          factory: marketFactory.address,
          marketId: h2hMarketId,
          pool: await makePoolCheck(ammFactory, marketFactory, h2hMarketId),
          winner: h2hMarket.winner,
        },
        {
          factory: marketFactory.address,
          marketId: spMarketId,
          pool: await makePoolCheck(ammFactory, marketFactory, spMarketId),
          winner: spMarket.winner,
        },
        {
          factory: marketFactory.address,
          marketId: ouMarketId,
          pool: await makePoolCheck(ammFactory, marketFactory, ouMarketId),
          winner: ouMarket.winner,
        },
      ],
      status: event.status,
      homeScore: event.homeScore,
      awayScore: event.awayScore,
    });
  });

  it("fetchDynamic [1,1]", async () => {
    const offset = 1;
    const total = 1;
    const [rawEventBundles, lowestEventIndex] = await fetcher.fetchDynamic(
      marketFactory.address,
      ammFactory.address,
      offset,
      total
    );

    expect(lowestEventIndex, "lowest event index").to.equal(0);

    const eventBundles = rawEventBundles.map(createDynamicSportsEventBundle);

    expect(eventBundles.length, "event bundles length").to.equal(1);
    expect(eventBundles[0].id, "event bundle 0 id").to.equal(eventId.add(1)); // least interesting event
  });
});

function dollars(howManyDollars: number): BigNumber {
  const basis = BigNumber.from(10).pow(6);
  return basis.mul(howManyDollars);
}

type UnPromisify<T> = T extends Promise<infer U> ? U : T;

type CheckableMarketFactory = NFLMarketFactory | MMAMarketFactory;

async function marketFactoryBundleCheck(marketFactory: CheckableMarketFactory, collateral: Cash, feePot: FeePot) {
  return {
    shareFactor: await marketFactory.shareFactor(),
    feePot: feePot.address,
    protocolFee: await marketFactory.protocolFee(),
    settlementFee: await marketFactory.settlementFee(),
    stakerFee: await marketFactory.stakerFee(),
    collateral: {
      addr: collateral.address,
      symbol: await collateral.symbol(),
      decimals: await collateral.decimals(),
    },
    marketCount: await marketFactory.marketCount(),
  };
}

async function makePoolCheck(ammFactory: AMMFactory, marketFactory: CheckableMarketFactory, marketId: BigNumberish) {
  const addr = await ammFactory.getPool(marketFactory.address, marketId);
  if (addr === NULL_ADDRESS) {
    return {
      addr,
      tokenRatios: [],
      balances: [],
      weights: [],
      swapFee: ZERO,
      totalSupply: ZERO,
    };
  } else {
    return {
      addr,
      tokenRatios: await ammFactory.tokenRatios(marketFactory.address, marketId),
      balances: await ammFactory.getPoolBalances(marketFactory.address, marketId),
      weights: await ammFactory.getPoolWeights(marketFactory.address, marketId),
      swapFee: await ammFactory.getSwapFee(marketFactory.address, marketId),
      totalSupply: INITIAL_TOTAL_SUPPLY_OF_BPOOL,
    };
  }
}
