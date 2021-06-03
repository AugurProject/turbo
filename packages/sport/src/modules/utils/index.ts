import { BigNumber as BN } from "bignumber.js";
import { AmmExchange } from "@augurproject/comps/build/types";
import { ContractCalls } from "@augurproject/comps";
const { estimateBuyTrade } = ContractCalls;

export interface SizedPrice {
  [outcomeId: number]: { size: string; price: string };
}

export const getSizedPrice = (amm: AmmExchange, liquidityPortion: number = 0.05): SizedPrice => {
  if (!amm) return null;
  if (!amm?.hasLiquidity) return null;

  const outcomePrices = Object.keys(amm.ammOutcomes).reduce((p, id) => {
    const shareAmount = new BN(amm.ammOutcomes[id]?.balance || "0")
      .times(new BN(liquidityPortion))
      .decimalPlaces(0, 1)
      .toFixed();
    const est = estimateBuyTrade(amm, shareAmount, Number(id), amm?.cash);
    const size = new BN(est?.averagePrice).times(new BN(shareAmount)).toFixed();
    return { ...p, [id]: { size, price: est?.averagePrice } };
  }, {});

  return outcomePrices;
};
