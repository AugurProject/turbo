export const COIN_SYMBOLS = ["BTC", "ETH", "MATIC", "DOGE", "REP", "LINK"] as const;
export type CoinMap = { [Property in typeof COIN_SYMBOLS[number]]: number };
export const COIN_IMPRECISIONS: CoinMap = {
  BTC: 0,
  ETH: 0,
  MATIC: 4,
  DOGE: 4,
  REP: 2,
  LINK: 2,
};
export const COIN_DECIMALS = 8;

export function coinDeploymentName(symbol: string): string {
  return `PriceFeed${symbol}`;
}

export function coinDescription(symbol: string): string {
  return `PriceFeed${symbol}`;
}
