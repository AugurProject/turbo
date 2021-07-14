import { BigNumber, BigNumberish } from "ethers";

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
  endTime: BigNumberish;
  winner: string;
}

interface RawStaticMarketBundle {
  factory: string;
  marketId: BigNumberish;
  pool: RawFetcherPool;
  shareTokens: string[];
  creationTimestamp: BigNumberish;
  endTime: BigNumberish;
  winner: string;
}

function createStaticMarketBundle(raw: RawStaticMarketBundle): StaticMarketBundle {
  return {
    factory: raw.factory,
    marketId: raw.marketId,
    pool: createFetcherPool(raw.pool),
    shareTokens: raw.shareTokens,
    creationTimestamp: raw.creationTimestamp,
    endTime: raw.endTime,
    winner: raw.winner,
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

// NBA

interface NBAMarketFactoryBundle extends MarketFactoryBundle {
  sportId: BigNumberish;
}

export function createNBAMarketFactoryBundle(raw: [RawMarketFactoryBundle, BigNumberish]): NBAMarketFactoryBundle {
  return {
    ...createMarketFactoryBundle(raw[0]),
    sportId: BigNumber.from(raw[1]),
  };
}

interface NBAStaticMarketBundle extends StaticMarketBundle {
  eventId: BigNumberish;
  homeTeamId: BigNumberish;
  awayTeamId: BigNumberish;
  estimatedStartTime: BigNumberish;
  marketType: BigNumberish;
  value0: BigNumberish;
  eventStatus: BigNumberish;
}

interface RawNBAStaticMarketBundle {
  super: RawStaticMarketBundle;
  eventId: BigNumberish;
  homeTeamId: BigNumberish;
  awayTeamId: BigNumberish;
  estimatedStartTime: BigNumberish;
  marketType: BigNumberish;
  value0: BigNumberish;
  eventStatus: BigNumberish;
}

export function createNBAStaticMarketBundle(raw: RawNBAStaticMarketBundle): NBAStaticMarketBundle {
  const bundle: NBAStaticMarketBundle & { super?: RawStaticMarketBundle } = {
    ...createStaticMarketBundle(raw.super),
    eventId: raw.eventId,
    homeTeamId: raw.homeTeamId,
    awayTeamId: raw.awayTeamId,
    estimatedStartTime: raw.estimatedStartTime,
    marketType: raw.marketType,
    value0: raw.value0,
    eventStatus: raw.eventStatus,
  };
  delete bundle.super;
  return bundle;
}

interface NBADynamicMarketBundle extends DynamicMarketBundle {
  eventStatus: BigNumberish;
}

interface RawNBADynamicMarketBundle {
  super: RawDynamicMarketBundle;
  eventStatus: BigNumberish;
}

export function createNBADynamicMarketBundle(raw: RawNBADynamicMarketBundle): NBADynamicMarketBundle {
  return {
    ...createDynamicMarketBundle(raw.super),
    eventStatus: raw.eventStatus,
  };
}

// MMA

interface MMAMarketFactoryBundle extends MarketFactoryBundle {
  sportId: BigNumberish;
}

export function createMMAMarketFactoryBundle(raw: [RawMarketFactoryBundle, BigNumberish]): MMAMarketFactoryBundle {
  return {
    ...createMarketFactoryBundle(raw[0]),
    sportId: BigNumber.from(raw[1]),
  };
}

interface MMAStaticMarketBundle extends StaticMarketBundle {
  eventId: BigNumberish;
  homeFighterName: string;
  homeFighterId: BigNumberish;
  awayFighterName: string;
  awayFighterId: BigNumberish;
  estimatedStartTime: BigNumberish;
  marketType: BigNumberish;
  headToHeadWeights: BigNumberish[];
  eventStatus: BigNumberish;
}

interface RawMMAStaticMarketBundle {
  super: RawStaticMarketBundle;
  eventId: BigNumberish;
  homeFighterName: string;
  homeFighterId: BigNumberish;
  awayFighterName: string;
  awayFighterId: BigNumberish;
  estimatedStartTime: BigNumberish;
  marketType: BigNumberish;
  headToHeadWeights: BigNumberish[];
  eventStatus: BigNumberish;
}

export function createMMAStaticMarketBundle(raw: RawMMAStaticMarketBundle): MMAStaticMarketBundle {
  const bundle: MMAStaticMarketBundle & { super?: RawStaticMarketBundle } = {
    ...createStaticMarketBundle(raw.super),
    eventId: raw.eventId,
    homeFighterName: raw.homeFighterName,
    homeFighterId: raw.homeFighterId,
    awayFighterName: raw.awayFighterName,
    awayFighterId: raw.awayFighterId,
    estimatedStartTime: raw.estimatedStartTime,
    marketType: raw.marketType,
    headToHeadWeights: raw.headToHeadWeights,
    eventStatus: raw.eventStatus,
  };
  delete bundle.super;
  return bundle;
}

interface MMADynamicMarketBundle extends DynamicMarketBundle {
  eventStatus: BigNumberish;
}

interface RawMMADynamicMarketBundle {
  super: RawDynamicMarketBundle;
  eventStatus: BigNumberish;
}

export function createMMADynamicMarketBundle(raw: RawMMADynamicMarketBundle): MMADynamicMarketBundle {
  return {
    ...createDynamicMarketBundle(raw.super),
    eventStatus: raw.eventStatus,
  };
}
