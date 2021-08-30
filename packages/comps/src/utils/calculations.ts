import { BigNumber as BN } from "bignumber.js";
import { AmmOutcome, MarketOutcome } from "types";
import { ZERO } from "./constants";

export const calculatePrices = (
  market: { outcomes: MarketOutcome[]; hasWinner: boolean },
  ratios: string[] = [],
  weights: string[] = []
): string[] => {
  let outcomePrices = [];
  if (!market) {
    console.error("market object undefined");
    return [];
  }
  const { outcomes, hasWinner } = market;
  if (hasWinner) {
    return outcomes.map((outcome) => (outcome.isWinner ? "1" : "0"));
  }
  //price[0] = ratio[0] / sum(ratio)
  const base = ratios.length > 0 ? ratios : weights;
  if (base.length > 0) {
    const sum = base.reduce((p, r) => p.plus(new BN(String(r))), ZERO);
    outcomePrices = base.map((r) => new BN(String(r)).div(sum).toFixed());
  }
  return outcomePrices;
};

// TODO: when new ammFactory is done use standard weights.
// creating weights at mid range for outcomes and 2% for no contest outcome
// will see if this approach will help against trolling initial LPs
// const defaultPriceWeights = ["0.02", "0.49", "0.49"];
export const calcWeights = (prices: string[]): string[] => {
  const totalWeight = new BN(50);
  const multiplier = new BN(10).pow(new BN(18));
  const results = prices.map((price) => new BN(price).times(totalWeight).times(multiplier).toFixed());
  return results;
};

export const calcPricesFromOdds = (initialOdds: string[], outcomes: AmmOutcome[]) => {
  // convert odds to prices and set prices on outcomes
  const outcomePrices = calculatePrices({ outcomes, hasWinner: false }, initialOdds, []);
  const populatedOutcomes = outcomes.map((o, i) => ({ ...o, price: outcomePrices[i] }));
  return populatedOutcomes;
};
