import { BigNumber as BN } from "bignumber.js";
import { AmmExchange, PositionBalance } from "@augurproject/comps/build/types";
import { ContractCalls } from "@augurproject/comps";
const { estimateBuyTrade, estimateSellTrade } = ContractCalls;

export interface SizedPrice {
  size: string;
  price: string;
}

export const getSizedPrice = (amm: AmmExchange, id: number, liquidityPortion: number = 0.05): SizedPrice => {
  if (!amm) return null;
  if (!amm?.hasLiquidity) return null;

  const outcome = amm.ammOutcomes.find((o) => o.id === id);
  if (!outcome) return null;
  const shareAmount = new BN(outcome.balance || "0").times(new BN(liquidityPortion)).decimalPlaces(0, 1).toFixed();
  const est = estimateBuyTrade(amm, shareAmount, Number(id), amm?.cash);
  const size = new BN(est?.averagePrice).times(new BN(shareAmount)).toFixed();
  return { size, price: est?.averagePrice };
};

export const estimatedCashOut = (amm: AmmExchange, position: PositionBalance): string => {
  if (!amm || !amm?.hasLiquidity || !position) return null;
  const shareAmount = position.quantity;
  const est = estimateSellTrade(amm, shareAmount, position.outcomeId, []);
  // can sell all position or none
  return est.maxSellAmount !== "0" ? null : est.outputValue;
};
