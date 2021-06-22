import { BigNumber as BN } from "bignumber.js";
import { AmmExchange, Cash, LoginAccount, TransactionDetails } from "@augurproject/comps/build/types";
import { ContractCalls, createBigNumber } from "@augurproject/comps";
import { TradingDirection, TX_STATUS } from "@augurproject/comps/build/utils/constants";
import { doTrade } from "@augurproject/comps/build/utils/contract-calls";
import { claimWinnings } from "@augurproject/comps/build/utils/contract-calls";
import { ActiveBetType } from "modules/stores/constants";
import { MarketInfo } from "@augurproject/comps/build/types";
import { approveERC20Contract, checkAllowance } from "@augurproject/comps/build/stores/use-approval-callback";
import { ApprovalState } from "modules/constants";
const { estimateBuyTrade, estimateSellTrade } = ContractCalls;

export interface SizedPrice {
  size: string;
  price: string;
}

export interface BuyAmount {
  price: string;
  maxProfit: string;
}
// id = outcome ID
export const getSizedPrice = (amm: AmmExchange, id: number, liquidityPortion: number = 0.1): SizedPrice => {
  if (!amm?.hasLiquidity) return null;

  const outcome = amm.ammOutcomes.find((o) => o.id === id);
  if (!outcome) return null;
  const size = new BN(outcome.balance || "0").times(new BN(liquidityPortion)).decimalPlaces(0, 1).toFixed();
  const est = estimateBuyTrade(amm, size, Number(id), amm?.cash);
  return { size, price: est?.averagePrice };
};

export const getBuyAmount = (amm: AmmExchange, id: number, amount: string): BuyAmount | null => {
  if (!amm?.hasLiquidity) return null;
  if (!amount || createBigNumber(amount).eq(0)) return null;

  const outcome = amm.ammOutcomes.find((o) => o.id === id);
  if (!outcome) return null;
  const est = estimateBuyTrade(amm, amount, Number(id), amm?.cash);
  if (!est) return null;
  return {
    price: est?.averagePrice,
    maxProfit: est?.maxProfit,
  };
};

export const estimatedCashOut = (amm: AmmExchange, size: string, outcomeId: number): string => {
  if (!amm?.hasLiquidity || !size) return null;
  const est = estimateSellTrade(amm, size, outcomeId, []);
  // can sell all position or none
  return est.maxSellAmount !== "0" ? null : est.outputValue;
};

const makeCashOut = async (
  loginAccount: LoginAccount,
  bet: ActiveBetType,
  market: MarketInfo
): Promise<TransactionDetails> => {
  if (!market || !market?.amm?.hasLiquidity || !bet) return null;
  const { amm } = market;
  const { cash } = amm;
  const shareAmount = bet.size;
  const defaultSlippage = "1";
  const est = estimateSellTrade(amm, shareAmount, bet.outcomeId, []);
  // can sell all position or none
  if (est.maxSellAmount !== "0") return null;
  const response = await doTrade(
    TradingDirection.EXIT,
    loginAccount?.library,
    amm,
    est.outputValue,
    shareAmount,
    bet.outcomeId,
    loginAccount?.account,
    cash,
    defaultSlippage,
    est?.outcomeShareTokensIn
  );
  return {
    hash: response?.hash,
    chainId: String(loginAccount.chainId),
    seen: false,
    from: loginAccount?.account,
    addedTime: new Date().getTime(),
    marketDescription: `${amm?.market?.title} ${amm?.market?.description}`,
  };
};

export const makeBet = async (
  loginAccount: LoginAccount,
  amm: AmmExchange,
  id: number,
  amount: string,
  account: string,
  cash: Cash
): Promise<TransactionDetails> => {
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
    from: account,
    addedTime: new Date().getTime(),
    message: "Bet Placed",
    marketDescription: `${amm?.market?.title} ${amm?.market?.description}`,
  };
};

export const claimMarketWinnings = async (
  loginAccount: LoginAccount,
  amm: AmmExchange
): Promise<TransactionDetails> => {
  if (amm && loginAccount && loginAccount?.account) {
    const { marketFactoryAddress, turboId } = amm?.market;
    return claimAll(loginAccount, [String(turboId)], marketFactoryAddress);
  }
  return null;
};

export const claimAll = async (
  loginAccount: LoginAccount,
  marketIndexes: string[],
  marketFactoryAddress: string
): Promise<TransactionDetails> => {
  if (loginAccount?.account) {
    const response = await claimWinnings(
      loginAccount?.account,
      loginAccount?.library,
      marketIndexes,
      marketFactoryAddress
    );
    return {
      hash: response?.hash,
      chainId: String(loginAccount.chainId),
      seen: false,
      from: loginAccount?.account,
      addedTime: new Date().getTime(),
      message: "Claim Winnings",
      marketDescription: `Claim Winnings`,
    };
  }
  return null;
};

export const isCashOutApproved = async (
  loginAccount: LoginAccount,
  bet: ActiveBetType,
  market: MarketInfo,
  transactions: TransactionDetails[]
): Promise<Boolean> => {
  const { outcomeId } = bet;
  const { amm } = market;
  const shareToken = market.shareTokens[outcomeId];
  const result = await checkAllowance(shareToken, amm.ammFactoryAddress, loginAccount, transactions);
  return result === ApprovalState.APPROVED;
};

const approveCashOut = async (
  loginAccount: LoginAccount,
  bet: ActiveBetType,
  market: MarketInfo
): Promise<TransactionDetails> => {
  const { outcomeId } = bet;
  const { amm } = market;
  const shareToken = market.shareTokens[outcomeId];
  return await approveERC20Contract(shareToken, "Cashout", amm.ammFactoryAddress, loginAccount);
};

export const approveOrCashOut = async (
  loginAccount: LoginAccount,
  bet: ActiveBetType,
  market: MarketInfo
): Promise<TransactionDetails> => {
  return (await bet.isApproved) ? makeCashOut(loginAccount, bet, market) : approveCashOut(loginAccount, bet, market);
};
