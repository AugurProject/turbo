import { BigNumber, BigNumberish } from "ethers";
import { AMMFactory, Sport, SportsFetcher } from "../typechain";

// Sports

export async function fetchInitialSports(
  fetcher: SportsFetcher,
  marketFactory: Sport,
  ammFactory: AMMFactory,
  initialOffset: BigNumberish = 0,
  bundleSize: BigNumberish = 50
): Promise<{ factoryBundle: SportsMarketFactoryBundle; markets: InitialSportsMarket[] }> {
  const eventCount = await marketFactory.eventCount();

  let factoryBundle: SportsMarketFactoryBundle | undefined;
  let eventBundles: StaticSportsEventBundle[] = [];

  for (let offset = BigNumber.from(initialOffset); ; ) {
    const [rawFactoryBundle, rawEventBundles, lowestEventIndex] = await fetcher.fetchInitial(
      marketFactory.address,
      ammFactory.address,
      offset,
      bundleSize
    );

    if (!factoryBundle) factoryBundle = createSportsMarketFactoryBundle(rawFactoryBundle);
    eventBundles = eventBundles.concat(rawEventBundles.map(createStaticSportsEventBundle));

    if (lowestEventIndex.eq(0)) break;
    offset = eventCount.sub(lowestEventIndex);
  }

  const markets: InitialSportsMarket[] = [];
  for (const event of eventBundles) {
    for (const market of event.markets) {
      markets.push({
        ...market,
        eventId: event.id,
        eventStatus: event.status,
        estimatedStartTime: event.estimatedStartTime,
        lines: event.lines,
        home: {
          id: event.homeTeamId,
          name: event.homeTeamName,
          score: event.homeScore,
        },
        away: {
          id: event.awayTeamId,
          name: event.awayTeamName,
          score: event.awayScore,
        },
      });
    }
  }

  return { factoryBundle, markets };
}

export async function fetchDynamicSports(
  fetcher: SportsFetcher,
  marketFactory: Sport,
  ammFactory: AMMFactory,
  initialOffset: BigNumberish = 0,
  bundleSize: BigNumberish = 50
) {
  const eventCount = await marketFactory.eventCount();

  let eventBundles: DynamicSportsEventBundle[] = [];

  for (let offset = BigNumber.from(initialOffset); ; ) {
    const [rawEventBundles, lowestEventIndex] = await fetcher.fetchDynamic(
      marketFactory.address,
      ammFactory.address,
      offset,
      bundleSize
    );

    eventBundles = eventBundles.concat(rawEventBundles.map(createDynamicSportsEventBundle));

    if (lowestEventIndex.eq(0)) break;
    offset = eventCount.sub(lowestEventIndex);
  }

  const markets: DynamicSportsMarket[] = [];
  for (const event of eventBundles) {
    for (const market of event.markets) {
      markets.push({
        ...market,
        eventId: event.id,
        eventStatus: event.status,
        home: {
          score: event.homeScore,
        },
        away: {
          score: event.awayScore,
        },
      });
    }
  }

  return { markets };
}

export interface InitialSportsMarket extends StaticMarketBundle {
  eventId: BigNumberish;
  eventStatus: BigNumberish;
  estimatedStartTime: BigNumberish;
  lines: BigNumberish[];
  home: SportsTeam;
  away: SportsTeam;
}
export interface DynamicSportsMarket extends DynamicMarketBundle {
  eventId: BigNumberish;
  eventStatus: BigNumberish;
  home: { score: BigNumberish };
  away: { score: BigNumberish };
}

interface SportsTeam {
  id: BigNumberish;
  name: string;
  score: BigNumberish;
}

function createSportsMarketFactoryBundle(raw: [RawMarketFactoryBundle]): SportsMarketFactoryBundle {
  return {
    ...createMarketFactoryBundle(raw[0]),
  };
}

function createStaticSportsEventBundle(raw: RawStaticSportsEventBundle): StaticSportsEventBundle {
  return {
    id: raw.id,
    markets: raw.markets.map((m) => createStaticMarketBundle(m)),
    lines: raw.lines,
    estimatedStartTime: raw.estimatedStartTime,
    homeTeamId: raw.homeTeamId,
    awayTeamId: raw.awayTeamId,
    homeTeamName: raw.homeTeamName,
    awayTeamName: raw.awayTeamName,
    status: raw.status,
    homeScore: raw.homeScore,
    awayScore: raw.awayScore,
  };
}

function createDynamicSportsEventBundle(raw: RawDynamicSportsEventBundle): DynamicSportsEventBundle {
  return {
    id: raw.id,
    markets: raw.markets.map((m) => createDynamicMarketBundle(m)),
    status: raw.status,
    homeScore: raw.homeScore,
    awayScore: raw.awayScore,
  };
}

interface SportsMarketFactoryBundle extends MarketFactoryBundle {}

interface StaticSportsEventBundle {
  id: BigNumberish;
  markets: StaticMarketBundle[];
  lines: BigNumberish[];
  estimatedStartTime: BigNumberish;
  homeTeamId: BigNumberish;
  awayTeamId: BigNumberish;
  homeTeamName: string;
  awayTeamName: string;
  status: BigNumberish;
  homeScore: BigNumberish;
  awayScore: BigNumberish;
}

interface RawStaticSportsEventBundle extends Omit<StaticSportsEventBundle, "markets"> {
  markets: RawStaticMarketBundle[];
}

interface DynamicSportsEventBundle {
  id: BigNumberish;
  markets: DynamicMarketBundle[];
  status: BigNumberish;
  homeScore: BigNumberish;
  awayScore: BigNumberish;
}

interface RawDynamicSportsEventBundle extends Omit<DynamicSportsEventBundle, "markets"> {
  markets: RawDynamicMarketBundle[];
}

// Common

interface FetcherPool {
  addr: string;
  tokenRatios: BigNumberish[];
  balances: BigNumberish[];
  weights: BigNumberish[];
  swapFee: BigNumberish;
  totalSupply: BigNumberish;
}
type RawFetcherPool = [string, BigNumberish[], BigNumberish[], BigNumberish[], BigNumberish, BigNumberish];

function createFetcherPool(raw: RawFetcherPool): FetcherPool {
  const [addr, tokenRatios, balances, weights, swapFee, totalSupply] = raw;
  return {
    addr,
    tokenRatios,
    balances,
    weights,
    swapFee,
    totalSupply,
  };
}

interface MarketFactoryBundle {
  shareFactor: BigNumberish;
  stakerFee: BigNumberish;
  settlementFee: BigNumberish;
  protocolFee: BigNumberish;
  feePot: string;
  collateral: {
    addr: string;
    symbol: string;
    decimals: number;
  };
  marketCount: BigNumberish;
}

interface RawMarketFactoryBundle extends Pick<MarketFactoryBundle, Exclude<keyof MarketFactoryBundle, "collateral">> {
  collateral: {
    addr: string;
    symbol: string;
    decimals: BigNumberish;
  };
}

function createMarketFactoryBundle(raw: RawMarketFactoryBundle): MarketFactoryBundle {
  return {
    shareFactor: raw.shareFactor,
    stakerFee: raw.stakerFee,
    settlementFee: raw.settlementFee,
    protocolFee: raw.protocolFee,
    feePot: raw.feePot,
    collateral: {
      addr: raw.collateral.addr,
      symbol: raw.collateral.symbol,
      decimals: BigNumber.from(raw.collateral.decimals).toNumber(),
    },
    marketCount: raw.marketCount,
  };
}

interface StaticMarketBundle {
  factory: string;
  marketId: BigNumberish;
  pool: FetcherPool;
  shareTokens: string[];
  creationTimestamp: BigNumberish;
  winner: string;
  initialOdds: BigNumberish[];
}

interface RawStaticMarketBundle {
  factory: string;
  marketId: BigNumberish;
  pool: RawFetcherPool;
  shareTokens: string[];
  creationTimestamp: BigNumberish;
  winner: string;
  initialOdds: BigNumberish[];
}

function createStaticMarketBundle(raw: RawStaticMarketBundle): StaticMarketBundle {
  return {
    factory: raw.factory,
    marketId: raw.marketId,
    pool: createFetcherPool(raw.pool),
    shareTokens: raw.shareTokens,
    creationTimestamp: raw.creationTimestamp,
    winner: raw.winner,
    initialOdds: raw.initialOdds,
  };
}

interface DynamicMarketBundle {
  factory: string;
  marketId: BigNumberish;
  pool: FetcherPool;
  winner: string;
}

interface RawDynamicMarketBundle {
  factory: string;
  marketId: BigNumberish;
  pool: RawFetcherPool;
  winner: string;
}

function createDynamicMarketBundle(raw: RawDynamicMarketBundle): DynamicMarketBundle {
  return {
    factory: raw.factory,
    marketId: raw.marketId,
    pool: createFetcherPool(raw.pool),
    winner: raw.winner,
  };
}
