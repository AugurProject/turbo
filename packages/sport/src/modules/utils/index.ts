import { BigNumber as BN } from "bignumber.js";
import { AmmExchange, Cash, LoginAccount, PositionBalance, TransactionDetails } from "@augurproject/comps/build/types";
import { ContractCalls } from "@augurproject/comps";
import { TransactionReceipt } from 'web3-core'
import { TransactionResponse, Web3Provider } from "@ethersproject/providers";
import Web3 from 'web3'
import { TradingDirection, TX_STATUS } from "@augurproject/comps/build/utils/constants";
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

export const makeBet = async (loginAccount: LoginAccount, amm: AmmExchange, id: number, amount: string, account: string, cash: Cash): Promise<TransactionDetails> => {
  const defaultSlippage = "1";
  const est = estimateBuyTrade(amm, amount, Number(id), amm?.cash);
  const minAmount = est.outputValue;
  const response = await doTrade(
    TradingDirection.ENTRY,
    loginAccount?.library,
    amm,
    minAmount,
    amount,
    id,
    account,
    cash,
    defaultSlippage,
    []
  );
  return {
    hash: response?.hash,
    chainId: String(loginAccount.chainId),
    seen: false,
    status: TX_STATUS.PENDING,
    from: account,
    addedTime: new Date().getTime(),
    marketDescription: `${amm?.market?.title} ${amm?.market?.description}`,
  }
}
