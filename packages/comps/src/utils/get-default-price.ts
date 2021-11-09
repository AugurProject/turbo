import BigNumber, { BigNumber as BN } from "bignumber.js";

export const getDefaultPrice = (outcome: string | number, weights: string[]): BigNumber => {
  if (!weights || weights.length === 0) return new BN(0);
  const total = weights.reduce((p, w) => p.plus(new BN(w)), new BN(0));
  const weight = new BN(weights[Number(outcome)]);
  return weight.div(total);
};
