import { BigNumber, BigNumberish } from "ethers";

export class FakeCoidn {
  readonly decimals = 8; // seems to be true of all of the real price feeds

  constructor(readonly symbol: string, readonly priceUSD: number, readonly imprecision: number) {}

  get deploymentName(): string {
    return `PriceFeed${this.symbol}`;
  }

  get description(): string {
    return `${this.symbol} / USD`;
  }

  get price(): BigNumber {
    // note that .toFixed() rounds while we truncate prices onchain
    return BigNumber.from((this.priceUSD * 10 ** this.decimals).toFixed());
  }
}

interface FakeCoin {
  symbol: string,
  priceUSD: number, // float
  imprecision: number,
  price: BigNumber,
  description: string,
  deploymentName: string,
  decimals: number
}
function fakeCoin(symbol: string, priceUSD: number, imprecision: number): FakeCoin {
  const decimals = 8; // seems to be true of all of the real price feeds

  // note that .toFixed() rounds while we truncate prices onchain
  const price = BigNumber.from((priceUSD * 10 ** decimals).toFixed());

  const description = `${symbol} / USD`
  const deploymentName = `PriceFeed${symbol}`;

  return {
    symbol,
    priceUSD,
    imprecision,
    price,
    description,
    deploymentName,
    decimals
  }
}

// Used by deployer for deploying fake price feeds for crypto markets.
export const FAKE_COINS: FakeCoin[] = [
  fakeCoin("BTC", 40000, 0),
  fakeCoin("ETH", 2500, 0),
  fakeCoin("MATIC", 1.23, 4),
  fakeCoin("DOGE", 0.55, 4),
  fakeCoin("REP", 48.12, 2),
  fakeCoin("LINK", 29.8, 2),
];
