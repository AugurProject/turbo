import { BigNumber, BigNumberish } from "ethers";

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

export interface PoolStatusInfo {
  beginTimestamp: BigNumberish;
  endTimestamp: BigNumberish;
  earlyDepositEndTimestamp: BigNumberish;
  totalRewardsAccrued: BigNumberish;
  created: boolean;
}

type RawPoolStatusInfo = [BigNumberish, BigNumberish, BigNumberish, BigNumberish, boolean];

export function createPoolStatusInfo(raw: RawPoolStatusInfo): PoolStatusInfo {
  const [beginTimestamp, endTimestamp, earlyDepositEndTimestamp, totalRewardsAccrued, created] = raw;
  return { beginTimestamp, endTimestamp, earlyDepositEndTimestamp, totalRewardsAccrued, created };
}

export interface MarketFactoryBundle {
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

export function createMarketFactoryBundle(raw: RawMarketFactoryBundle): MarketFactoryBundle {
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

export interface StaticMarketBundle {
  factory: string;
  marketId: BigNumberish;
  pool: FetcherPool;
  rewards: PoolStatusInfo;
  shareTokens: string[];
  creationTimestamp: BigNumberish;
  winner: string;
  initialOdds: BigNumberish[];
}

export interface RawStaticMarketBundle {
  factory: string;
  marketId: BigNumberish;
  pool: RawFetcherPool;
  rewards: RawPoolStatusInfo;
  shareTokens: string[];
  creationTimestamp: BigNumberish;
  winner: string;
  initialOdds: BigNumberish[];
}

export function createStaticMarketBundle(raw: RawStaticMarketBundle): StaticMarketBundle {
  return {
    factory: raw.factory,
    marketId: raw.marketId,
    pool: createFetcherPool(raw.pool),
    rewards: createPoolStatusInfo(raw.rewards),
    shareTokens: raw.shareTokens,
    creationTimestamp: raw.creationTimestamp,
    winner: raw.winner,
    initialOdds: raw.initialOdds,
  };
}

export interface DynamicMarketBundle {
  factory: string;
  marketId: BigNumberish;
  pool: FetcherPool;
  winner: string;
}

export interface RawDynamicMarketBundle {
  factory: string;
  marketId: BigNumberish;
  pool: RawFetcherPool;
  winner: string;
}

export function createDynamicMarketBundle(raw: RawDynamicMarketBundle): DynamicMarketBundle {
  return {
    factory: raw.factory,
    marketId: raw.marketId,
    pool: createFetcherPool(raw.pool),
    winner: raw.winner,
  };
}
