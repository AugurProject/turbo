import { BigNumber as BN } from "bignumber.js";
import { AmmExchange, Cash, PositionBalance } from "@augurproject/comps/build/types";
import { ContractCalls } from "@augurproject/comps";
import { TransactionReceipt } from 'web3-core'
import { TransactionResponse, Web3Provider } from "@ethersproject/providers";
import Web3 from 'web3'
import { TradingDirection } from "@augurproject/comps/build/utils/constants";
import { doTrade } from "@augurproject/comps/build/utils/contract-calls";
const { estimateBuyTrade, estimateSellTrade } = ContractCalls;

export interface SizedPrice {
  size: string;
  price: string;
}

export interface BuyAmount {
  price: string;
  maxProfit: string;
}

export const getSizedPrice = (amm: AmmExchange, id: number, liquidityPortion: number = 0.10): SizedPrice => {
  if (!amm) return null;
  if (!amm?.hasLiquidity) return null;

  const outcome = amm.ammOutcomes.find((o) => o.id === id);
  if (!outcome) return null;
  const size = new BN(outcome.balance || "0").times(new BN(liquidityPortion)).decimalPlaces(0, 1).toFixed();
  const est = estimateBuyTrade(amm, size, Number(id), amm?.cash);
  return { size, price: est?.averagePrice };
};

export const getBuyAmount = (amm: AmmExchange, id: number, amount: string): BuyAmount => {
  if (!amm) return null;
  if (!amm?.hasLiquidity) return null;

  const outcome = amm.ammOutcomes.find((o) => o.id === id);
  if (!outcome) return null;
  const est = estimateBuyTrade(amm, amount, Number(id), amm?.cash);
  return {
    price: est?.averagePrice,
    maxProfit: est?.maxProfit
  };
};

export const estimatedCashOut = (amm: AmmExchange, position: PositionBalance): string => {
  if (!amm || !amm?.hasLiquidity || !position) return null;
  const shareAmount = position.quantity;
  const est = estimateSellTrade(amm, shareAmount, position.outcomeId, []);
  // can sell all position or none
  return est.maxSellAmount !== "0" ? null : est.outputValue;
};

export const makeBet = async (provider: Web3Provider, amm: AmmExchange, id: number, amount: string, account: string, cash: Cash): Promise<string> => {
  const defaultSlippage = "1";
  const minAmount = "0";
  const response = await doTrade(
    TradingDirection.ENTRY,
    provider,
    amm,
    minAmount,
    amount,
    id,
    account,
    cash,
    defaultSlippage,
    []
  );
  return response?.hash;
}
