import { BigNumber } from "ethers";

export class FakeCoin {
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

// Used by deployer for deploying fake price feeds for crypto markets.
export const FAKE_COINS: FakeCoin[] = [
  new FakeCoin("BTC", 40000, 0),
  new FakeCoin("ETH", 2500, 0),
  new FakeCoin("DOT", 21, 0),
  new FakeCoin("MATIC", 1.23, 4),
];
