import { BigNumber } from "ethers";

export interface MarketCapFeed {
  symbol: string;
  marketCapUSD: number; // float
  imprecision: number;
  marketCap: BigNumber;
  description: string;
  deploymentName: string;
  decimals: number;
}
export function marketCapFeed(symbol: string, marketCapUSD: number, imprecision: number): MarketCapFeed {
  const decimals = 8; // seems to be true of all of the real market cap feeds

  // note that .toFixed() rounds while we truncate market caps onchain
  const marketCap = BigNumber.from((marketCapUSD * 10 ** decimals).toFixed());

  const description = `${symbol} / USD`;
  const deploymentName = `MarketCapFeed${symbol}`;

  return {
    symbol,
    marketCapUSD: marketCapUSD,
    imprecision,
    marketCap: marketCap,
    description,
    deploymentName,
    decimals,
  };
}

// Used by deployer for deploying fake market cap feeds or finding existing deployments for crypto markets.
export const MARKET_CAP_FEEDS: MarketCapFeed[] = [
  marketCapFeed("BTC", 400_000_000_000, 0),
  marketCapFeed("ETH", 20_000_000_000, 0),
  marketCapFeed("MATIC", 500_000_000, 4),
  marketCapFeed("DOGE", 1_000_000, 4),
  marketCapFeed("REP", 51_000_100, 2),
  marketCapFeed("LINK", 700_400_008, 2),
];

export const MARKET_CAP_FEEDS_BY_SYMBOL = MARKET_CAP_FEEDS.reduce((all, x) => {
  all[x.symbol] = x;
  return all;
}, {} as { [symbol: string]: MarketCapFeed });
