import { BigNumber } from "ethers";

interface PriceFeed {
  symbol: string;
  priceUSD: number; // float
  imprecision: number;
  price: BigNumber;
  description: string;
  deploymentName: string;
  decimals: number;
}
function priceFeed(symbol: string, priceUSD: number, imprecision: number): PriceFeed {
  const decimals = 8; // seems to be true of all of the real price feeds

  // note that .toFixed() rounds while we truncate prices onchain
  const price = BigNumber.from((priceUSD * 10 ** decimals).toFixed());

  const description = `${symbol} / USD`;
  const deploymentName = `PriceFeed${symbol}`;

  return {
    symbol,
    priceUSD,
    imprecision,
    price,
    description,
    deploymentName,
    decimals,
  };
}

// Used by deployer for deploying fake price feeds or finding existing deployments for crypto markets.
export const PRICE_FEEDS: PriceFeed[] = [
  priceFeed("BTC", 40000, 0),
  priceFeed("ETH", 2500, 0),
  priceFeed("MATIC", 1.23, 4),
  priceFeed("DOGE", 0.55, 4),
  priceFeed("REP", 48.12, 2),
  priceFeed("LINK", 29.8, 2),
];
