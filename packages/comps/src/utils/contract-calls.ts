import BigNumber, { BigNumber as BN } from "bignumber.js";
import {
  AddRemoveLiquidity,
  AllMarketsTransactions,
  AllUserMarketTransactions,
  AmmExchange,
  AmmExchanges,
  AmmMarketShares,
  AmmOutcome,
  BuySellTransactions,
  Cash,
  Cashes,
  ClaimWinningsTransactions,
  CurrencyBalance,
  EstimateTradeResult,
  LiquidityBreakdown,
  LPTokenBalance,
  LPTokens,
  MarketFactoryNames,
  MarketInfo,
  MarketInfos,
  MarketTransactions,
  PendingUserReward,
  PositionBalance,
  RewardsInfo,
  UserBalances,
  UserClaimTransactions,
  UserMarketTransactions,
} from "../types";
import { ethers } from "ethers";
import { Contract } from "@ethersproject/contracts";

// @ts-ignore
import { ContractCallContext, ContractCallReturnContext, Multicall } from "@augurproject/ethereum-multicall";
import { TransactionResponse, Web3Provider } from "@ethersproject/providers";
import {
  cashOnChainToDisplay,
  convertDisplayCashAmountToOnChainCashAmount,
  convertDisplayShareAmountToOnChainShareAmount,
  convertOnChainCashAmountToDisplayCashAmount,
  isSameAddress,
  lpTokenPercentageAmount,
  lpTokensOnChainToDisplay,
  sharesDisplayToOnChain,
  sharesOnChainToDisplay,
} from "./format-number";
import {
  DAYS_IN_YEAR,
  DUST_LIQUIDITY_AMOUNT,
  DUST_POSITION_AMOUNT,
  DUST_POSITION_AMOUNT_ON_CHAIN,
  ETH,
  MARKET_FACTORY_TYPES,
  MARKET_LOAD_TYPE,
  MARKET_STATUS,
  NULL_ADDRESS,
  SEC_IN_DAY,
  SPORTS_MARKET_TYPE,
  TradingDirection,
  USDC,
  ZERO,
  POLYGON_NETWORK,
  POLYGON_PRICE_FEED_MATIC,
  MAX_LAG_BLOCKS,
} from "./constants";
import { getProviderOrSigner } from "../components/ConnectAccount/utils";
import { createBigNumber } from "./create-big-number";
import { PARA_CONFIG } from "../stores/constants";
import ERC20ABI from "./ERC20ABI.json";
import ParaShareTokenABI from "./ParaShareTokenABI.json";
import PriceFeedABI from "./PriceFeedABI.json";

import {
  AbstractMarketFactoryV2,
  AbstractMarketFactoryV2__factory,
  AMMFactory,
  AMMFactory__factory,
  BPool,
  BPool__factory,
  calcSellCompleteSets,
  Cash__factory,
  estimateBuy,
  instantiateMarketFactory,
  MarketFactory,
  MarketFactoryContract,
  MasterChef,
  MasterChef__factory,
} from "@augurproject/smart";
import { fetcherMarketsPerConfig, isIgnoredMarket, isIgnoreOpendMarket } from "./derived-market-data";

const trimDecimalValue = (value: string | BigNumber) => createBigNumber(value).decimalPlaces(6, 1).toFixed();

export const checkConvertLiquidityProperties = (
  account: string,
  marketId: string,
  amount: string,
  fee: string,
  outcomes: AmmOutcome[],
  cash: Cash
): boolean => {
  if (!account || !marketId || !amount || !outcomes || outcomes.length === 0 || !cash) return false;
  if (amount === "0" || amount === "0.00") return false;
  if (Number(fee) < 0) return false;

  return true;
};

export async function mintCompleteSets(
  amm: AmmExchange,
  provider: Web3Provider,
  amount: string,
  account: string
): Promise<TransactionResponse> {
  if (!provider) {
    console.error("mintCompleteSets: no provider");
    return null;
  }
  if (!amm || !amm?.ammFactoryAddress) {
    console.error("minCompleteSets: no amm provided");
    return null;
  }

  const marketFactoryData = getMarketFactoryData(amm.marketFactoryAddress);
  if (!marketFactoryData) return null;
  const marketFactoryContract = getMarketFactoryContract(provider, marketFactoryData, account);
  const totalAmount = sharesDisplayToOnChain(amount).toFixed();
  console.log("mint", marketFactoryContract.address, amm?.market?.turboId, totalAmount, account);
  const tx = await marketFactoryContract.mintShares(amm?.market?.turboId, totalAmount, account).catch((e) => {
    console.error(e);
    throw e;
  });

  return tx;
}

export async function estimateAddLiquidityPool(
  account: string,
  provider: Web3Provider,
  amm: AmmExchange,
  cash: Cash,
  cashAmount: string
): Promise<LiquidityBreakdown> {
  if (!provider) console.error("provider is null");
  const ammFactoryContract = getAmmFactoryContract(provider, amm.ammFactoryAddress, account);
  const { amount, marketFactoryAddress, turboId } = shapeAddLiquidityPool(amm, cash, cashAmount);
  const ammAddress = amm?.id;

  let results = null;
  let tokenAmount = "0";
  let minAmounts = [];
  let minAmountsRaw = [];
  let poolPct = "0";

  const rewardContractAddress = getRewardsContractAddress(amm.marketFactoryAddress);
  const rewardContract = rewardContractAddress ? getRewardContract(provider, rewardContractAddress, account) : null;

  if (!ammAddress) {
    console.log("est add init", marketFactoryAddress, turboId, amount, account);
    results = rewardContractAddress
      ? await rewardContract.callStatic.createPool(
          amm.ammFactoryAddress,
          marketFactoryAddress,
          turboId,
          amount,
          account
        )
      : await ammFactoryContract.callStatic.createPool(marketFactoryAddress, turboId, amount, account);
    tokenAmount = trimDecimalValue(sharesOnChainToDisplay(String(results || "0")));
  } else {
    // todo: get what the min lp token out is
    console.log("est add additional", marketFactoryAddress, "marketId", turboId, "amount", amount, 0, account);

    results = rewardContractAddress
      ? await rewardContract.callStatic.addLiquidity(
          amm.ammFactoryAddress,
          marketFactoryAddress,
          turboId,
          amount,
          0,
          account
        )
      : await ammFactoryContract.callStatic.addLiquidity(marketFactoryAddress, turboId, amount, 0, account);
    if (results) {
      const { _balances, _poolAmountOut } = results;
      minAmounts = _balances
        ? _balances.map((v, i) => ({
            amount: lpTokensOnChainToDisplay(String(v)).toFixed(),
            outcomeId: i,
            hide: lpTokensOnChainToDisplay(String(v)).lt(DUST_POSITION_AMOUNT),
          }))
        : [];
      minAmountsRaw = _balances ? _balances.map((v) => new BN(String(v)).toFixed()) : [];
      // lp tokens are 18 decimal
      tokenAmount = trimDecimalValue(sharesOnChainToDisplay(String(_poolAmountOut)));

      const poolSupply = lpTokensOnChainToDisplay(amm?.totalSupply).plus(tokenAmount);
      poolPct = String(lpTokenPercentageAmount(tokenAmount, poolSupply));
    }
  }

  if (!results) return null;

  return {
    amount: tokenAmount,
    minAmounts,
    minAmountsRaw,
    poolPct,
  };
}

export async function addLiquidityPool(
  account: string,
  provider: Web3Provider,
  amm: AmmExchange,
  cash: Cash,
  cashAmount: string,
  minAmount: string,
  outcomes: AmmOutcome[]
): Promise<TransactionResponse> {
  if (!provider) console.error("provider is null");
  const ammFactoryContract = getAmmFactoryContract(provider, amm.ammFactoryAddress, account);
  const rewardContractAddress = getRewardsContractAddress(amm.marketFactoryAddress);
  const { amount, marketFactoryAddress, turboId } = shapeAddLiquidityPool(amm, cash, cashAmount);
  const bPoolId = amm?.id;
  const minLpTokenAllowed = "0"; //sharesDisplayToOnChain(minLptokenAmount).toFixed();
  let tx = null;
  console.log(
    !bPoolId ? "add init liquidity:" : "add additional liquidity",
    "amm",
    amm.ammFactoryAddress,
    "factory",
    marketFactoryAddress,
    "marketIndex",
    turboId,
    "amount",
    amount,
    "account",
    account
  );
  if (rewardContractAddress) {
    const contract = getRewardContract(provider, rewardContractAddress, account);
    // use reward contract (master chef) to add liquidity
    if (!bPoolId) {
      tx = contract.createPool(amm.ammFactoryAddress, marketFactoryAddress, turboId, amount, account, {
        // gasLimit: "800000",
        // gasPrice: "10000000000",
      });
    } else {
      tx = contract.addLiquidity(
        amm.ammFactoryAddress,
        marketFactoryAddress,
        turboId,
        amount,
        minLpTokenAllowed,
        account,
        {
          // gasLimit: "800000",
          // gasPrice: "10000000000",
        }
      );
    }
  } else {
    if (!bPoolId) {
      tx = ammFactoryContract.createPool(marketFactoryAddress, turboId, amount, account, {
        // gasLimit: "800000",
        // gasPrice: "10000000000",
      });
    } else {
      tx = ammFactoryContract.addLiquidity(marketFactoryAddress, turboId, amount, minLpTokenAllowed, account, {
        // gasLimit: "800000",
        // gasPrice: "10000000000",
      });
    }
  }

  return tx;
}

function shapeAddLiquidityPool(
  amm: AmmExchange,
  cash: Cash,
  cashAmount: string
): { amount: string; marketFactoryAddress: string; turboId: number } {
  const { marketFactoryAddress, turboId } = amm;
  const amount = convertDisplayCashAmountToOnChainCashAmount(cashAmount, cash.decimals).toFixed();
  return {
    marketFactoryAddress,
    turboId,
    amount,
  };
}

export async function getRemoveLiquidity(
  amm: AmmExchange,
  provider: Web3Provider,
  lpTokenBalance: string,
  account: string,
  cash: Cash,
  hasWinner: boolean = false
): Promise<LiquidityBreakdown | null> {
  if (!provider) {
    console.error("getRemoveLiquidity: no provider");
    return null;
  }
  const { market } = amm;
  const ammFactory = getAmmFactoryContract(provider, amm.ammFactoryAddress, account);

  // balancer lp tokens are 18 decimal places
  const lpBalance = convertDisplayCashAmountToOnChainCashAmount(lpTokenBalance, 18).toFixed();
  let results = null;
  let minAmounts = null;
  let minAmountsRaw = null;
  let collateralOut = "0";

  const rewardContractAddress = getRewardsContractAddress(amm.marketFactoryAddress);
  const rewardContract = rewardContractAddress ? getRewardContract(provider, rewardContractAddress, account) : null;
  results = rewardContractAddress
    ? await rewardContract.callStatic
        .removeLiquidity(amm.ammFactoryAddress, market.marketFactoryAddress, market.turboId, lpBalance, "0", account) // uint256[] calldata minAmountsOut values be?
        .catch((e) => {
          console.log(e);
          throw e;
        })
    : await ammFactory.callStatic
        .removeLiquidity(market.marketFactoryAddress, market.turboId, lpBalance, "0", account) // uint256[] calldata minAmountsOut values be?
        .catch((e) => {
          console.log(e);
          throw e;
        });

  const balances = results ? results?._balances || results[1] : [];
  collateralOut = results ? results?._collateralOut || results[0] || "0" : collateralOut;
  minAmounts = balances.map((v, i) => ({
    amount: lpTokensOnChainToDisplay(String(v)).toFixed(),
    outcomeId: i,
    hide: lpTokensOnChainToDisplay(String(v)).lt(DUST_POSITION_AMOUNT),
  }));
  minAmountsRaw = balances.map((v) => new BN(String(v)).toFixed());

  if (!results) return null;

  const amount = cashOnChainToDisplay(String(collateralOut), cash.decimals).toFixed();
  const poolPct = String(lpTokenPercentageAmount(lpTokenBalance, lpTokensOnChainToDisplay(amm?.totalSupply || "1")));

  return {
    minAmountsRaw,
    minAmounts,
    amount,
    poolPct,
  };
}

export async function estimateLPTokenInShares(
  balancerPoolId: string,
  provider: Web3Provider,
  lpTokenBalance: string,
  account: string,
  outcomes: AmmOutcome[] = []
): Promise<LiquidityBreakdown | null> {
  if (!provider || !balancerPoolId) {
    console.error("estimate lp tokens: no provider or no balancer pool id");
    return null;
  }
  const balancerPool = getBalancerPoolContract(provider, balancerPoolId, account);
  // balancer lp tokens are 18 decimal places
  const lpBalance = convertDisplayCashAmountToOnChainCashAmount(lpTokenBalance, 18).toFixed();

  const results = await balancerPool
    .calcExitPool(
      lpBalance,
      outcomes.map((o) => "0")
    ) // uint256[] calldata minAmountsOut values be?
    .catch((e) => {
      console.log(e);
      throw e;
    });

  if (!results) return null;
  const minAmounts = results.map((v) => ({ amount: lpTokensOnChainToDisplay(String(v)).toFixed() }));
  const minAmountsRaw: string[] = results.map((v) => new BN(String(v)).toFixed());

  return {
    minAmountsRaw,
    minAmounts,
  };
}

export function doRemoveLiquidity(
  amm: AmmExchange,
  provider: Web3Provider,
  lpTokenBalance: string,
  amountsRaw: string[],
  account: string,
  cash: Cash,
  hasWinner = false
): Promise<TransactionResponse | null> {
  if (!provider) {
    console.error("doRemoveLiquidity: no provider");
    return null;
  }
  const { market } = amm;
  const ammFactory = getAmmFactoryContract(provider, amm.ammFactoryAddress, account);
  const lpBalance = convertDisplayCashAmountToOnChainCashAmount(lpTokenBalance, 18).toFixed();
  const balancerPool = getBalancerPoolContract(provider, amm?.id, account);
  const rewardContractAddress = getRewardsContractAddress(amm.marketFactoryAddress);

  if (rewardContractAddress) {
    const contract = getRewardContract(provider, rewardContractAddress, account);
    return contract.removeLiquidity(
      amm.ammFactoryAddress,
      market.marketFactoryAddress,
      market.turboId,
      lpBalance,
      "0",
      account
    );
  } else {
    return hasWinner
      ? balancerPool.exitPool(lpBalance, amountsRaw)
      : ammFactory.removeLiquidity(market.marketFactoryAddress, market.turboId, lpBalance, "0", account);
  }
}

export const estimateBuyTrade = (
  amm: AmmExchange,
  inputDisplayAmount: string,
  selectedOutcomeId: number,
  cash: Cash
): EstimateTradeResult | null => {
  const amount = convertDisplayCashAmountToOnChainCashAmount(inputDisplayAmount, cash.decimals)
    .decimalPlaces(0, 1)
    .toFixed();
  let result = null;
  try {
    result = estimateBuy(amm.shareFactor, selectedOutcomeId, amount, amm.balancesRaw, amm.weights, amm.feeRaw);
  } catch (e) {
    if (String(e).indexOf("ERR_DIV_ZERO") > -1) {
      console.log("Insufficent Liquidity to estimate buy", inputDisplayAmount);
    } else {
      console.log("error in estimate buy", e);
    }
  }

  if (!result) return null;

  const estimatedShares = sharesOnChainToDisplay(String(result));
  const tradeFees = String(new BN(inputDisplayAmount).times(new BN(amm.feeDecimal)));
  const averagePrice = new BN(inputDisplayAmount).div(new BN(estimatedShares));
  const maxProfit = String(new BN(estimatedShares).minus(new BN(inputDisplayAmount)));
  const price = new BN(amm.ammOutcomes[selectedOutcomeId]?.price);
  const priceImpact = price.minus(averagePrice).times(100).toFixed(4);
  const ratePerCash = new BN(estimatedShares).div(new BN(inputDisplayAmount)).toFixed(6);

  return {
    outputValue: trimDecimalValue(estimatedShares),
    tradeFees,
    averagePrice: averagePrice.toFixed(4),
    maxProfit,
    ratePerCash,
    priceImpact,
  };
};

export const estimateSellTrade = (
  amm: AmmExchange,
  inputDisplayAmount: string,
  selectedOutcomeId: number,
  userBalances: { outcomeSharesRaw: string[] }
): EstimateTradeResult | null => {
  const amount = sharesDisplayToOnChain(inputDisplayAmount).toFixed();

  const [setsOut, undesirableTokensInPerOutcome] = calcSellCompleteSets(
    amm.shareFactor,
    selectedOutcomeId,
    amount,
    amm.balancesRaw,
    amm.weights,
    amm.feeRaw
  );
  let maxSellAmount = "0";
  const completeSets = sharesOnChainToDisplay(setsOut); // todo: debugging div 1000 need to fix
  const tradeFees = String(new BN(inputDisplayAmount).times(new BN(amm.feeDecimal)).toFixed(4));

  const displayAmount = new BN(inputDisplayAmount);
  const averagePrice = new BN(completeSets).div(displayAmount);
  const price = new BN(String(amm.ammOutcomes[selectedOutcomeId].price));
  const userShares = userBalances?.outcomeSharesRaw
    ? new BN(userBalances?.outcomeSharesRaw?.[selectedOutcomeId] || "0")
    : "0";
  const priceImpact = averagePrice.minus(price).times(100).toFixed(4);
  const ratePerCash = new BN(completeSets).div(displayAmount).toFixed(6);
  const displayShares = sharesOnChainToDisplay(userShares);
  const remainingShares = new BN(displayShares || "0").minus(displayAmount).abs();

  const sumUndesirable = (undesirableTokensInPerOutcome || []).reduce((p, u) => p.plus(new BN(u)), ZERO);

  const canSellAll = new BN(amount).minus(sumUndesirable).abs();

  if (canSellAll.gte(new BN(amm.shareFactor))) {
    maxSellAmount = sharesOnChainToDisplay(sumUndesirable).decimalPlaces(4, 1).toFixed();
  }

  return {
    outputValue: String(completeSets),
    tradeFees,
    averagePrice: averagePrice.toFixed(2),
    maxProfit: null,
    ratePerCash,
    remainingShares: remainingShares.toFixed(6),
    priceImpact,
    outcomeShareTokensIn: undesirableTokensInPerOutcome, // just a pass through to sell trade call
    maxSellAmount,
  };
};

export async function doTrade(
  tradeDirection: TradingDirection,
  provider: Web3Provider,
  amm: AmmExchange,
  minAmount: string,
  inputDisplayAmount: string,
  selectedOutcomeId: number,
  account: string,
  cash: Cash,
  slippage: string,
  outcomeShareTokensIn: string[] = []
) {
  if (!provider) return console.error("doTrade: no provider");
  const ammFactoryContract = getAmmFactoryContract(provider, amm.ammFactoryAddress, account);
  const { marketFactoryAddress, turboId } = amm;
  const amount = convertDisplayCashAmountToOnChainCashAmount(inputDisplayAmount, cash.decimals).toFixed();
  const minAmountWithSlippage = new BN(1).minus(new BN(slippage).div(100)).times(new BN(minAmount));
  console.log("minAmount", minAmount, "withSlippage", String(minAmountWithSlippage));
  let onChainMinShares = convertDisplayShareAmountToOnChainShareAmount(
    minAmountWithSlippage,
    cash.decimals
  ).decimalPlaces(0);

  if (tradeDirection === TradingDirection.ENTRY) {
    console.log(
      "address",
      marketFactoryAddress,
      "turboId",
      turboId,
      "outcome",
      selectedOutcomeId,
      "amount",
      amount,
      "min",
      String(onChainMinShares)
    );
    return ammFactoryContract.buy(marketFactoryAddress, turboId, selectedOutcomeId, amount, onChainMinShares.toFixed());
  }

  if (tradeDirection === TradingDirection.EXIT) {
    const { marketFactoryAddress, turboId } = amm;
    const amount = sharesDisplayToOnChain(inputDisplayAmount).toFixed();
    let min = new BN(minAmount);
    if (min.lt(0)) {
      min = new BN("0.01"); // set to 1 cent until estimate gets worked out.
    }

    if (onChainMinShares.lt(0)) {
      onChainMinShares = ZERO;
    }

    console.log(
      "doExitPosition:",
      marketFactoryAddress,
      "marketId",
      String(turboId),
      "outcome",
      selectedOutcomeId,
      "amount",
      String(amount),
      "min amount",
      onChainMinShares.toFixed(),
      "share tokens in",
      outcomeShareTokensIn
    );

    return ammFactoryContract.sellForCollateral(
      marketFactoryAddress,
      turboId,
      selectedOutcomeId,
      outcomeShareTokensIn,
      onChainMinShares.toFixed()
      //,{ gasLimit: "800000", gasPrice: "10000000000"}
    );
  }

  return null;
}

export const claimWinnings = (
  account: string,
  provider: Web3Provider,
  marketIds: string[],
  factoryAddress: string
): Promise<TransactionResponse | null> => {
  if (!provider) {
    console.error("claimWinnings: no provider");
    return null;
  }
  const marketFactoryContract = getAbstractMarketFactoryContract(provider, factoryAddress, account);
  return marketFactoryContract.claimManyWinnings(marketIds, account);
};

export const claimFees = (
  account: string,
  provider: Web3Provider,
  factoryAddress: string
): Promise<TransactionResponse | null> => {
  if (!provider) {
    console.error("claimFees: no provider");
    return null;
  }
  const marketFactoryContract = getAbstractMarketFactoryContract(provider, factoryAddress, account);
  return marketFactoryContract.claimSettlementFees(account);
};

export const cashOutAllShares = (
  account: string,
  provider: Web3Provider,
  balancesRaw: string[],
  marketId: string,
  shareFactor: string,
  factoryAddress: string
): Promise<TransactionResponse | null> => {
  if (!provider) {
    console.error("cashOutAllShares: no provider");
    return null;
  }
  const marketFactoryContract = getAbstractMarketFactoryContract(provider, factoryAddress, account);
  const shareAmount = BigNumber.min(...balancesRaw);
  const normalizedAmount = shareAmount
    .div(new BN(shareFactor))
    .decimalPlaces(0, 1)
    .times(new BN(shareFactor))
    .decimalPlaces(0, 1);
  console.log("share to cash out", shareAmount.toFixed(), marketId, normalizedAmount.toFixed(), account);
  return marketFactoryContract.burnShares(
    marketId,
    normalizedAmount.toFixed(),
    account
    //, { gasLimit: "800000", gasPrice: "10000000000", }
  );
};

export const getCompleteSetsAmount = (outcomeShares: string[]): string => {
  const shares = (outcomeShares || []).map((s, i) => new BN(outcomeShares[i] || "0"));
  const amount = BigNumber.min(...shares);
  if (isNaN(Number(amount.toFixed()))) return "0";
  const isDust = amount.lte(DUST_POSITION_AMOUNT);
  return isDust ? "0" : amount.toFixed();
};

const MULTI_CALL_LIMIT = 100;
const chunkedMulticall = async (
  provider: Web3Provider,
  contractCalls,
  callingMethod: string,
  chunkSize: number = MULTI_CALL_LIMIT,
  currentBlockNumber: number = 0
): Promise<{ blocknumber: number; results: { [key: string]: ContractCallReturnContext } }> => {
  if (!provider) {
    throw new Error("Provider not provided");
  }

  const multicall = new Multicall({ ethersProvider: provider });
  let results = { blocknumber: null, results: {} };

  if (!contractCalls || contractCalls.length === 0) return results;
  if (contractCalls.length < chunkSize) {
    const res = await multicall.call(contractCalls).catch((e) => {
      console.error("multicall", callingMethod, contractCalls);
      throw e;
    });
    results = { results: res.results, blocknumber: res.blockNumber };
  } else {
    const combined = {
      blocknumber: null,
      results: {},
    };
    const chunks = sliceIntoChunks(contractCalls, chunkSize);
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const call = await multicall.call(chunk).catch((e) => {
        console.error(`multicall, ${callingMethod} chunking ${chunk.length} calls`);
        throw e;
      });
      combined.blocknumber = call.blockNumber;
      combined.results = { ...combined.results, ...call.results };
    }
    results = combined;
  }
  if (Math.abs(currentBlockNumber - results.blocknumber) >= MAX_LAG_BLOCKS) {
    const msg = `user balance data more than ${MAX_LAG_BLOCKS} blocks, ${provider.connection.url}`;
    console.error(msg);
    throw new Error(msg);
  }
  return results;
};

const sliceIntoChunks = (arr, chunkSize) => {
  const res = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    const chunk = arr.slice(i, i + chunkSize);
    res.push(chunk);
  }
  return res;
};

export const getUserBalances = async (
  provider: Web3Provider,
  account: string,
  ammExchanges: AmmExchanges,
  cashes: Cashes,
  markets: MarketInfos,
  transactions: AllMarketsTransactions | UserClaimTransactions,
  currentBlockNumber: number = 0
): Promise<UserBalances> => {
  const userBalances = {
    ETH: {
      balance: "0",
      rawBalance: "0",
      usdValue: "0",
    },
    USDC: {
      balance: "0",
      rawBalance: "0",
      usdValue: "0",
    },
    totalPositionUsd: "0",
    total24hrPositionUsd: "0",
    change24hrPositionUsd: "0",
    totalAccountValue: "0",
    availableFundsUsd: "0",
    lpTokens: {},
    marketShares: {},
    claimableWinnings: {},
    pendingRewards: {},
    claimableFees: "0",
    approvals: {},
    totalRewards: "0",
    totalAccountValueOpenOnly: "0",
    totalCurrentLiquidityUsd: "0",
  };

  if (!account || !provider) {
    console.log("returning default");
    return userBalances;
  }

  const userMarketTransactions = getUserTransactions(transactions as AllMarketsTransactions, account);
  const userClaims = transactions as UserClaimTransactions;
  const BALANCE_OF = "balanceOf";
  const POOL_TOKEN_BALANCE = "getPoolTokenBalance"; // on master chef
  const POOL_TOKEN_BALANCE_BAL = "getTokenBalanceByPool"; // on amm factory
  const POOL_PENDING_REWARDS = "getUserPendingRewardInfo";
  const LP_TOKEN_COLLECTION = "lpTokens";
  const PENDING_REWARDS_COLLECTION = "pendingRewards";
  const MARKET_SHARE_COLLECTION = "marketShares";
  const APPROVAL_COLLECTION = "approvals";
  const ALLOWANCE = "allowance";

  // finalized markets
  const finalizedMarkets = Object.values(markets).filter((m) => m.reportingState === MARKET_STATUS.FINALIZED);
  const finalizedMarketIds = finalizedMarkets.map((f) => f.marketId);
  const finalizedAmmExchanges = Object.values(ammExchanges).filter((a) => finalizedMarketIds.includes(a.marketId));
  const ammFactoryAddresses = Object.values(ammExchanges).reduce(
    (p, exchange) => (p.includes(exchange.ammFactoryAddress) ? p : [...p, exchange.ammFactoryAddress]),
    []
  );

  // balance of
  const exchanges = Object.values(ammExchanges).filter((e) => e.id && e.totalSupply !== "0");
  const allExchanges = Object.values(ammExchanges).filter((e) => e.id);
  userBalances.ETH = await getEthBalance(provider, cashes, account);
  const usdc = Object.values(cashes).find((c) => c.name === USDC);

  const supportRewards = rewardsSupported(ammFactoryAddresses);
  const rewardsUnsupportedExchanges = exchanges.filter((f) => !supportRewards.includes(f.ammFactoryAddress));
  const supportRewardsExchanges = exchanges.filter((f) => supportRewards.includes(f.ammFactoryAddress));
  const ammFactoryAbi =
    supportRewards.length > 0 ? extractABI(getAmmFactoryContract(provider, supportRewards[0], account)) : null;

  const contractLpBalanceRewardsCall: ContractCallContext[] = ammFactoryAbi
    ? supportRewardsExchanges.reduce(
        (p, exchange) => [
          ...p,
          {
            reference: `${exchange.id}-lp`,
            contractAddress: getRewardsContractAddress(exchange.marketFactoryAddress),
            abi: extractABI(
              getRewardContract(provider, getRewardsContractAddress(exchange.marketFactoryAddress), account)
            ),
            calls: [
              {
                reference: `${exchange.id}-lp`,
                methodName: POOL_TOKEN_BALANCE,
                methodParameters: [
                  exchange.ammFactoryAddress,
                  exchange.marketFactoryAddress,
                  exchange.turboId,
                  account,
                ],
                context: {
                  dataKey: exchange.marketId,
                  collection: LP_TOKEN_COLLECTION,
                  decimals: 18,
                  marketId: exchange.marketId,
                  totalSupply: exchange?.totalSupply,
                },
              },
            ],
          },
          {
            reference: `${exchange.id}-reward`,
            contractAddress: getRewardsContractAddress(exchange.marketFactoryAddress),
            abi: extractABI(
              getRewardContract(provider, getRewardsContractAddress(exchange.marketFactoryAddress), account)
            ),
            calls: [
              {
                reference: `${exchange.id}-reward`,
                methodName: POOL_PENDING_REWARDS,
                methodParameters: [
                  exchange.ammFactoryAddress,
                  exchange.marketFactoryAddress,
                  exchange.turboId,
                  account,
                ],
                context: {
                  dataKey: exchange.marketId,
                  collection: PENDING_REWARDS_COLLECTION,
                  decimals: 18,
                  marketId: exchange.marketId,
                },
              },
            ],
          },
        ],
        []
      )
    : [];

  const contractLpBalanceCall: ContractCallContext[] = rewardsUnsupportedExchanges.map((exchange) => ({
    reference: exchange.id,
    contractAddress: exchange.id,
    abi: ERC20ABI,
    calls: [
      {
        reference: exchange.id,
        methodName: BALANCE_OF,
        methodParameters: [account],
        context: {
          dataKey: exchange.marketId,
          collection: LP_TOKEN_COLLECTION,
          decimals: 18,
          marketId: exchange.marketId,
          totalSupply: exchange?.totalSupply,
        },
      },
    ],
  }));

  const contractAmmFactoryApprovals: ContractCallContext[] = ammFactoryAddresses.map((address) => ({
    reference: address,
    contractAddress: usdc.address,
    abi: ERC20ABI,
    calls: [
      {
        reference: address,
        methodName: ALLOWANCE,
        methodParameters: [account, address],
        context: {
          dataKey: address,
          collection: APPROVAL_COLLECTION,
        },
      },
    ],
  }));

  const contractMarketShareBalanceCall: ContractCallContext[] = allExchanges.reduce((p, exchange) => {
    const shareTokenOutcomeShareBalances = exchange.ammOutcomes.map((outcome) => ({
      reference: `${outcome.shareToken}`,
      contractAddress: outcome.shareToken,
      abi: ERC20ABI,
      calls: [
        {
          reference: `${outcome.shareToken}`,
          methodName: BALANCE_OF,
          methodParameters: [account],
          context: {
            dataKey: outcome.shareToken,
            collection: MARKET_SHARE_COLLECTION,
            decimals: exchange?.cash?.decimals,
            marketId: exchange.marketId,
            outcomeId: outcome.id,
          },
        },
      ],
    }));
    return [...p, ...shareTokenOutcomeShareBalances];
  }, []);

  let basicBalanceCalls: ContractCallContext[] = [];

  if (usdc) {
    basicBalanceCalls = [
      {
        reference: "usdc-balance",
        contractAddress: usdc.address,
        abi: ERC20ABI,
        calls: [
          {
            reference: "usdcBalance",
            methodName: BALANCE_OF,
            methodParameters: [account],
            context: {
              dataKey: USDC,
              collection: null,
              decimals: usdc?.decimals,
            },
          },
        ],
      },
    ];
  }

  const balanceCalls = [
    ...basicBalanceCalls,
    ...contractMarketShareBalanceCall,
    ...contractLpBalanceCall,
    ...contractAmmFactoryApprovals,
    ...contractLpBalanceRewardsCall,
  ];

  const balanceResult = await chunkedMulticall(provider, balanceCalls, "getUserBalances", 20, currentBlockNumber);

  for (let i = 0; i < Object.keys(balanceResult.results).length; i++) {
    const key = Object.keys(balanceResult.results)[i];
    const method = String(balanceResult.results[key].originalContractCallContext.calls[0].methodName);
    const balanceValue = balanceResult.results[key].callsReturnContext[0].returnValues[0] as ethers.utils.Result;
    const context = balanceResult.results[key].originalContractCallContext.calls[0].context;
    const rawBalance = new BN(balanceValue._hex).toFixed();
    const { dataKey, collection, decimals, marketId, outcomeId, totalSupply } = context;
    const balance = convertOnChainCashAmountToDisplayCashAmount(new BN(rawBalance), new BN(decimals));

    if (method === POOL_TOKEN_BALANCE) {
      if (rawBalance !== "0") {
        const lpBalance = lpTokensOnChainToDisplay(rawBalance);
        const total = lpTokensOnChainToDisplay(totalSupply);
        const poolPct = lpTokenPercentageAmount(lpBalance, total);
        userBalances[collection][dataKey] = {
          balance: lpBalance.toFixed(),
          rawBalance,
          marketId,
          poolPct,
        };
      } else {
        delete userBalances[collection][dataKey];
      }
    } else if (method === POOL_PENDING_REWARDS) {
      const {
        accruedEarlyDepositBonusRewards,
        accruedStandardRewards,
        earlyDepositEndTimestamp,
        pendingEarlyDepositBonusRewards,
        endTimestamp,
      } = balanceValue;
      const balance = convertOnChainCashAmountToDisplayCashAmount(
        new BN(String(accruedStandardRewards)),
        new BN(decimals)
      ).toFixed();
      const pendingBonusRewards = convertOnChainCashAmountToDisplayCashAmount(
        new BN(String(pendingEarlyDepositBonusRewards.add(accruedEarlyDepositBonusRewards))),
        new BN(decimals)
      ).toFixed();
      const earnedBonus = convertOnChainCashAmountToDisplayCashAmount(
        new BN(String(accruedEarlyDepositBonusRewards)),
        new BN(decimals)
      ).toFixed();
      if (rawBalance !== "0") {
        userBalances[collection][dataKey] = {
          balance,
          rawBalance: new BN(String(accruedStandardRewards)).toFixed(),
          marketId,
          pendingBonusRewards,
          earnedBonus,
          endEarlyBonusTimestamp: new BN(String(earlyDepositEndTimestamp)).toNumber(),
          endBonusTimestamp: new BN(String(endTimestamp)).toNumber(),
        };
      } else {
        delete userBalances[collection][dataKey];
      }
    } else if (method === BALANCE_OF) {
      if (!collection) {
        userBalances[dataKey] = {
          balance: balance.toFixed(),
          rawBalance: rawBalance,
          usdValue: balance.toFixed(),
        };
      } else if (collection === MARKET_SHARE_COLLECTION) {
        const fixedShareBalance = sharesOnChainToDisplay(new BN(rawBalance)).toFixed();
        // shape AmmMarketShares
        const existingMarketShares = userBalances[collection][marketId];
        const marketTransactions = userMarketTransactions[marketId];
        const exchange = ammExchanges[marketId];
        const isDust = new BN(rawBalance).lt(DUST_POSITION_AMOUNT_ON_CHAIN);
        if (existingMarketShares && !isDust) {
          const position = getPositionUsdValues(
            marketTransactions,
            rawBalance,
            fixedShareBalance,
            outcomeId,
            exchange,
            account,
            userClaims,
            marketId
          );
          if (position) userBalances[collection][marketId].positions.push(position);
          userBalances[collection][marketId].outcomeSharesRaw[outcomeId] = rawBalance;
          userBalances[collection][marketId].outcomeShares[outcomeId] = fixedShareBalance;
        } else if (!isDust) {
          userBalances[collection][marketId] = {
            ammExchange: exchange,
            positions: [],
            outcomeSharesRaw: [],
            outcomeShares: [],
          };
          // calc user position here **
          const position = getPositionUsdValues(
            marketTransactions,
            rawBalance,
            fixedShareBalance,
            outcomeId,
            exchange,
            account,
            userClaims,
            marketId
          );
          if (position) userBalances[collection][marketId].positions.push(position);
          userBalances[collection][marketId].outcomeSharesRaw[outcomeId] = rawBalance;
          userBalances[collection][marketId].outcomeShares[outcomeId] = fixedShareBalance;
        }
      }
    } else if (method === ALLOWANCE) {
      userBalances[collection][dataKey] = new BN(rawBalance).gt(ZERO);
    }
  }

  if (finalizedMarkets.length > 0) {
    const keyedFinalizedMarkets = finalizedMarkets.reduce((p, f) => ({ ...p, [f.marketId]: f }), {});
    populateClaimableWinnings(keyedFinalizedMarkets, finalizedAmmExchanges, userBalances.marketShares);
  }

  const totalRewards = Object.values((userBalances.pendingRewards as unknown) as PendingUserReward[])
    .reduce((p, r) => p.plus(new BN(r.balance)), ZERO)
    .toFixed();
  const userPositions = getTotalPositions(userBalances.marketShares);
  let openMarketShares = {};
  Object.keys(userBalances.marketShares).forEach((marketId) => {
    if (userBalances.marketShares[marketId]?.ammExchange?.market?.winner === null) {
      openMarketShares[marketId] = userBalances.marketShares[marketId];
    }
  });
  const availableFundsUsd = String(new BN(userBalances.USDC.usdValue));
  await populateInitLPValues(userBalances.lpTokens, provider, ammExchanges, account);
  const totalCurrentLiquidityUsd = String(
    Object.values((userBalances.lpTokens as unknown) as LPTokenBalance[]).reduce(
      (p, l) => p.plus(new BN(l.usdValue)),
      ZERO
    )
  );
  const totalAccountValue = String(
    new BN(availableFundsUsd).plus(new BN(userPositions.totalPositionUsd)).plus(new BN(totalCurrentLiquidityUsd))
  );
  const userOpenPositions = getTotalPositions(openMarketShares);
  const totalAccountValueOpenOnly = String(
    new BN(availableFundsUsd).plus(new BN(userOpenPositions.totalPositionUsd)).plus(new BN(totalCurrentLiquidityUsd))
  );
  const userOpenPositionsOpenOnly = {
    change24hrPositionUsdOpenOnly: userOpenPositions.change24hrPositionUsd,
    total24hrPositionUsdOpenOnly: userOpenPositions.total24hrPositionUsd,
    totalPositionUsdOpenOnly: userOpenPositions.totalPositionUsd,
  };

  return {
    ...userBalances,
    ...userPositions,
    ...userOpenPositionsOpenOnly,
    totalAccountValueOpenOnly,
    totalAccountValue,
    availableFundsUsd,
    totalCurrentLiquidityUsd,
    totalRewards,
  };
};

const populateClaimableWinnings = (
  finalizedMarkets: MarketInfos = {},
  finalizedAmmExchanges: AmmExchange[] = [],
  marketShares: AmmMarketShares = {}
): void => {
  finalizedAmmExchanges.reduce((p, amm) => {
    const market = finalizedMarkets[amm.marketId];
    const winningOutcome = market.winner ? market.outcomes[market.winner] : null;
    if (winningOutcome) {
      const outcomeBalances = marketShares[amm.marketId];
      const userShares = outcomeBalances?.positions.find((p) => p.outcomeId === winningOutcome.id);
      if (userShares && new BN(userShares?.rawBalance).gt(0)) {
        const claimableBalance = new BN(userShares.balance).minus(new BN(userShares.initCostUsd)).abs().toFixed(4);
        marketShares[amm.marketId].claimableWinnings = {
          claimableBalance,
          userBalances: outcomeBalances.outcomeSharesRaw,
        };
      }
    }
    return p;
  }, {});
};

const getTotalPositions = (
  ammMarketShares: AmmMarketShares
): { change24hrPositionUsd: string; totalPositionUsd: string; total24hrPositionUsd: string } => {
  const result = Object.keys(ammMarketShares).reduce(
    (p, ammId) => {
      const outcomes = ammMarketShares[ammId];
      outcomes.positions.forEach((position) => {
        p.total = p.total.plus(new BN(position.usdValue));
        if (position.past24hrUsdValue) {
          p.total24 = p.total24.plus(new BN(position.past24hrUsdValue));
        }
      });
      return p;
    },
    { total: new BN("0"), total24: new BN("0") }
  );

  const change24hrPositionUsd = String(result.total.minus(result.total24));
  return {
    change24hrPositionUsd,
    total24hrPositionUsd: String(result.total24),
    totalPositionUsd: String(result.total),
  };
};

const getPositionUsdValues = (
  marketTransactions: UserMarketTransactions,
  rawBalance: string,
  balance: string,
  outcome: string,
  amm: AmmExchange,
  account: string,
  userClaims: UserClaimTransactions,
  marketId: string
): PositionBalance => {
  let past24hrUsdValue = null;
  let change24hrPositionUsd = null;
  let avgPrice = "0";
  let initCostUsd = "0";
  let totalChangeUsd = "0";
  let timestamp = 0;
  let quantity = trimDecimalValue(balance);
  const outcomeId = Number(outcome);
  const price = amm.ammOutcomes[outcomeId].price;
  const outcomeName = amm.ammOutcomes[outcomeId].name;
  let visible = false;
  let positionFromAddLiquidity = false;
  let positionFromRemoveLiquidity = false;

  // need to get this from outcome
  const maxUsdValue = new BN(balance).times(new BN(amm.cash.usdPrice)).toFixed();

  let result = {
    avgPrice: "0",
    positionFromRemoveLiquidity: false,
    positionFromAddLiquidity: false,
  };

  const currUsdValue = new BN(balance).times(new BN(price)).times(new BN(amm.cash.usdPrice)).toFixed();
  const postitionResult = getInitPositionValues(marketTransactions, amm, outcome, account, userClaims);

  if (postitionResult) {
    result = postitionResult;
    avgPrice = trimDecimalValue(result.avgPrice);
    initCostUsd = new BN(result.avgPrice).times(new BN(quantity)).toFixed(4);
    timestamp = postitionResult.timestamp;
  }

  let usdChangedValue = new BN(currUsdValue).minus(new BN(initCostUsd));
  // ignore negative dust difference
  if (usdChangedValue.lt(new BN("0")) && usdChangedValue.gt(new BN("-0.001"))) {
    usdChangedValue = usdChangedValue.abs();
  }
  totalChangeUsd = trimDecimalValue(usdChangedValue);
  visible = true;
  positionFromAddLiquidity = !result.positionFromRemoveLiquidity && result.positionFromAddLiquidity;
  positionFromRemoveLiquidity = result.positionFromRemoveLiquidity;

  if (new BN(balance).lt(DUST_POSITION_AMOUNT)) return null;

  return {
    balance,
    quantity,
    rawBalance,
    usdValue: currUsdValue,
    past24hrUsdValue,
    change24hrPositionUsd,
    totalChangeUsd,
    avgPrice,
    initCostUsd,
    outcomeName,
    outcomeId,
    maxUsdValue,
    visible,
    positionFromAddLiquidity,
    positionFromRemoveLiquidity,
    timestamp,
    marketId,
  };
};

export const getLPCurrentValue = async (
  displayBalance: string,
  provider: Web3Provider,
  amm: AmmExchange,
  account: string
): Promise<string> => {
  const { ammOutcomes } = amm;
  if (!ammOutcomes || ammOutcomes.length === 0 || displayBalance === "0") return null;
  const estimate = await estimateLPTokenInShares(amm.id, provider, displayBalance, account, amm.ammOutcomes).catch(
    (e) => {
      console.error("getLPCurrentValue estimation error", e);
      throw e;
    }
  );

  if (estimate && estimate.minAmountsRaw) {
    const totalValueRaw = ammOutcomes.reduce(
      (p, v, i) => p.plus(new BN(estimate.minAmounts[i].amount).times(v.price)),
      ZERO
    );

    return totalValueRaw.times(amm?.cash?.usdPrice).toFixed();
  }
  return null;
};

const populateInitLPValues = async (
  lptokens: LPTokens,
  provider: Web3Provider,
  ammExchanges: AmmExchanges,
  account: string
): Promise<LPTokens> => {
  const marketIds = Object.keys(lptokens);
  for (let i = 0; i < marketIds.length; i++) {
    const marketId = marketIds[i];
    const lptoken = lptokens[marketId];
    const amm = ammExchanges[marketId];
    // sum up enters/exits transaction usd cash values
    const initialCashValueUsd = "0";
    lptoken.initCostUsd = initialCashValueUsd;
    lptoken.usdValue = lptoken?.balance ? await getLPCurrentValue(lptoken.balance, provider, amm, account) : "0";
  }

  return lptokens;
};

export const getUserLpTokenInitialAmount = (
  transactions: AllMarketsTransactions,
  account: string,
  cash: Cash
): { [marketId: string]: string } => {
  return Object.keys(transactions).reduce((p, marketId) => {
    const id = marketId.toLowerCase();
    const adds = (transactions[marketId]?.addLiquidity || [])
      .filter((t) => isSameAddress(t.sender?.id, account))
      .reduce((p, t) => p.plus(new BN(t.collateral || "0").abs()), new BN("0"));
    const removed = (transactions[marketId]?.removeLiquidity || [])
      .filter((t) => isSameAddress(t.sender?.id, account))
      .reduce((p, t) => p.plus(new BN(t.collateral || "0").abs()), new BN("0"));
    const initCostUsd = String(adds.minus(removed));
    return {
      ...p,
      [id]: convertOnChainCashAmountToDisplayCashAmount(initCostUsd, cash.decimals).toFixed(),
    };
  }, {});
};

const getUserTransactions = (transactions: AllMarketsTransactions, account: string): AllUserMarketTransactions => {
  if (!transactions) return {};
  return Object.keys(transactions).reduce((p, marketId) => {
    const id = marketId.toLowerCase();
    const addLiquidity = (transactions[marketId]?.addLiquidity || []).filter((t) =>
      isSameAddress(t.sender?.id, account)
    );
    const removeLiquidity = (transactions[marketId]?.removeLiquidity || []).filter((t) =>
      isSameAddress(t.sender?.id, account)
    );
    const buys = (transactions[marketId]?.trades || []).filter(
      (t) => isSameAddress(t.user, account) && new BN(t.collateral).lt(0)
    );
    const sells = (transactions[marketId]?.trades || []).filter(
      (t) => isSameAddress(t.user, account) && new BN(t.collateral).gt(0)
    );

    return {
      ...p,
      [id]: {
        addLiquidity,
        removeLiquidity,
        buys,
        sells,
      },
    };
  }, {});
};

const getDefaultPrice = (outcome: string, weights: string[]) => {
  const total = weights.reduce((p, w) => p.plus(new BN(w)), ZERO);
  const weight = new BN(weights[Number(outcome)]);
  return weight.div(total);
};

const getInitPositionValues = (
  marketTransactions: UserMarketTransactions,
  amm: AmmExchange,
  outcome: string,
  account: string,
  userClaims: UserClaimTransactions
): { avgPrice: string; positionFromAddLiquidity: boolean; positionFromRemoveLiquidity: boolean; timestamp: number } => {
  const outcomeId = String(new BN(outcome));
  // sum up trades shares
  const claimTimestamp = lastClaimTimestamp(userClaims?.claimedProceeds, outcomeId, account);
  const sharesEntered = accumSharesPrice(marketTransactions?.buys, outcomeId, account, claimTimestamp);
  const enterAvgPriceBN = sharesEntered.avgPrice;
  const defaultAvgPrice = getDefaultPrice(outcome, amm.weights);

  // get shares from LP activity
  const sharesAddLiquidity = accumLpSharesPrice(
    marketTransactions?.addLiquidity,
    outcomeId,
    account,
    claimTimestamp,
    amm.shareFactor,
    defaultAvgPrice
  );
  const sharesRemoveLiquidity = accumLpSharesPrice(
    marketTransactions?.removeLiquidity,
    outcome,
    account,
    claimTimestamp,
    amm.shareFactor,
    defaultAvgPrice
  );

  const positionFromAddLiquidity = sharesAddLiquidity.shares.gt(ZERO);
  const positionFromRemoveLiquidity = sharesRemoveLiquidity.shares.gt(ZERO);

  const outcomeLiquidityShares = sharesRemoveLiquidity.shares.plus(sharesAddLiquidity.shares);

  const avgPriceLiquidity = outcomeLiquidityShares.gt(0)
    ? sharesAddLiquidity.avgPrice
        .times(sharesAddLiquidity.shares)
        .plus(sharesRemoveLiquidity.avgPrice.times(sharesRemoveLiquidity.shares))
        .div(sharesAddLiquidity.shares.plus(sharesRemoveLiquidity.shares))
    : ZERO;

  const totalShares = outcomeLiquidityShares.plus(sharesEntered.shares);
  const weightedAvgPrice = totalShares.gt(ZERO)
    ? avgPriceLiquidity
        .times(outcomeLiquidityShares)
        .div(totalShares)
        .plus(enterAvgPriceBN.times(sharesEntered.shares).div(totalShares))
    : 0;

  const timestamp = [
    ...(marketTransactions?.addLiquidity || []),
    ...(marketTransactions?.removeLiquidity || []),
    ...(marketTransactions?.buys || []),
    ...(marketTransactions?.sells || []),
  ].reduce((p, v) => (Number(v.timestamp) > p ? Number(v.timestamp) : p), 0);

  return {
    avgPrice: String(weightedAvgPrice),
    positionFromAddLiquidity,
    positionFromRemoveLiquidity,
    timestamp,
  };
};

const accumSharesPrice = (
  transactions: BuySellTransactions[],
  outcome: string,
  account: string,
  cutOffTimestamp: number
): { shares: BigNumber; cashAmount: BigNumber; avgPrice: BigNumber } => {
  if (!transactions || transactions.length === 0) return { shares: ZERO, cashAmount: ZERO, avgPrice: ZERO };
  const result = transactions
    .filter(
      (t) =>
        isSameAddress(t.user, account) && new BN(t.outcome).eq(new BN(outcome)) && Number(t.timestamp) > cutOffTimestamp
    )
    .reduce(
      (p, t) => {
        const shares = p.shares.plus(new BN(t.shares)).abs();
        const cashAmount = p.cashAmount.plus(new BN(t.collateral).abs());
        const accumAvgPrice = new BN(t.collateral).times(new BN(t.price)).abs().plus(p.accumAvgPrice);
        return {
          shares,
          cashAmount,
          accumAvgPrice,
        };
      },
      { shares: ZERO, cashAmount: ZERO, accumAvgPrice: ZERO }
    );
  const avgPrice = result.cashAmount.eq(ZERO) ? ZERO : result.accumAvgPrice.div(result.cashAmount);
  return { shares: result.shares, cashAmount: result.cashAmount, avgPrice };
};

const accumLpSharesPrice = (
  transactions: AddRemoveLiquidity[],
  outcome: string,
  account: string,
  cutOffTimestamp: number,
  shareFactor: string,
  outcomeDefaultAvgPrice: BigNumber
): { shares: BigNumber; cashAmount: BigNumber; avgPrice: BigNumber } => {
  if (!transactions || transactions.length === 0) return { shares: ZERO, cashAmount: ZERO, avgPrice: ZERO };
  const result = transactions
    .filter((t) => isSameAddress(t?.sender?.id, account) && Number(t.timestamp) > cutOffTimestamp)
    .reduce(
      (p, t) => {
        const outcomeShares = new BN(t.sharesReturned[Number(outcome)]);
        let shares = t.sharesReturned && t.sharesReturned.length > 0 ? outcomeShares : ZERO;
        if (shares.gt(ZERO) && shares.lte(DUST_POSITION_AMOUNT_ON_CHAIN)) {
          return p;
        }

        const cashValue = outcomeShares.eq(ZERO)
          ? ZERO
          : outcomeShares.div(new BN(shareFactor)).div(new BN(t.sharesReturned.length)).abs();
        return {
          shares: p.shares.plus(shares),
          cashAmount: p.cashAmount.plus(new BN(cashValue)),
        };
      },
      { shares: ZERO, cashAmount: ZERO }
    );

  return { shares: result.shares, cashAmount: result.cashAmount, avgPrice: new BN(outcomeDefaultAvgPrice) };
};

export const calculateAmmTotalVolApy = (
  amm: AmmExchange,
  transactions: MarketTransactions,
  rewards: RewardsInfo,
  hasWinner: boolean = false
): { apy: string; vol?: number; vol24hr?: number } => {
  const defaultValues = { apy: undefined, vol: null, vol24hr: null };
  if (!amm?.id || (transactions?.addLiquidity || []).length === 0 || Object.keys(transactions).length === 0)
    return defaultValues;
  const { feeDecimal, liquidityUSD, cash, totalSupply } = amm;

  if (totalSupply === "0") return defaultValues;
  const timestamp24hr = Math.floor(new Date().getTime() / 1000 - Number(SEC_IN_DAY));
  // calc total volume
  const volumeTotalUSD = calcTotalVolumeUSD(transactions, cash).toNumber();
  const volumeTotalUSD24hr = calcTotalVolumeUSD(transactions, cash, timestamp24hr).toNumber();

  const sortedAddLiquidity = (transactions?.addLiquidity || []).sort((a, b) =>
    Number(a.timestamp) > Number(b.timestamp) ? 1 : -1
  );
  const startTimestamp = Number(sortedAddLiquidity[0].timestamp);
  const totalTradingVolUSD = volumeTotalUSD || 0;
  if (startTimestamp === 0) return defaultValues;

  const totalFeesInUsd = new BN(totalTradingVolUSD).times(new BN(feeDecimal || "0"));
  const currTimestamp = Math.floor(new Date().getTime() / 1000); // current time in unix timestamp
  const secondsPast = currTimestamp - startTimestamp;
  const pastDays = Math.floor(new BN(secondsPast).div(SEC_IN_DAY).toNumber());
  const maticPrice = defaultMaticPrice; // don't make eth call.
  const rewardsUsd = new BN(rewards.totalRewardsAccrued || "0").times(new BN(maticPrice || "1"));

  const tradeFeeLiquidityPerDay = new BN(liquidityUSD).lte(DUST_LIQUIDITY_AMOUNT)
    ? rewardsUsd.div(new BN(liquidityUSD)).div(new BN(pastDays || 1))
    : rewardsUsd
        .plus(totalFeesInUsd)
        .div(new BN(liquidityUSD))
        .div(new BN(pastDays || 1));

  const tradeFeePerDayInYear =
    hasWinner || !tradeFeeLiquidityPerDay
      ? undefined
      : tradeFeeLiquidityPerDay.times(DAYS_IN_YEAR).abs().times(100).toFixed(4);

  return { apy: tradeFeePerDayInYear, vol: totalTradingVolUSD, vol24hr: volumeTotalUSD24hr };
};

const calcTotalVolumeUSD = (transactions: MarketTransactions, cash: Cash, cutoffTimestamp: number = 0) => {
  const { trades } = transactions;
  const totalCollateral = (trades || []).reduce(
    (p, b) => (Number(b.timestamp) > cutoffTimestamp ? p.plus(new BN(b.collateral).abs()) : p),
    ZERO
  );
  return convertOnChainCashAmountToDisplayCashAmount(totalCollateral, cash.decimals);
};

const lastClaimTimestamp = (transactions: ClaimWinningsTransactions[], outcome: string, account: string): number => {
  if (!transactions || transactions.length === 0) return 0;
  const claims = transactions.filter((c) => isSameAddress(c.receiver, account) && c.outcome === outcome);
  return claims.reduce((p, c) => (Number(c.timestamp) > p ? Number(c.timestamp) : p), 0);
};

const getEthBalance = async (provider: Web3Provider, cashes: Cashes, account: string): Promise<CurrencyBalance> => {
  const ethCash = Object.values(cashes).find((c) => c.name === ETH);
  const ethbalance = await provider.getBalance(account);
  const ethValue = convertOnChainCashAmountToDisplayCashAmount(new BN(String(ethbalance)), 18);

  return {
    balance: String(ethValue),
    rawBalance: String(ethbalance),
    usdValue: ethCash ? String(ethValue.times(new BN(ethCash.usdPrice))) : String(ethValue),
  };
};

export const isAddress = (value) => {
  try {
    return ethers.utils.getAddress(value.toLowerCase());
  } catch {
    return false;
  }
};

export const getContract = (tokenAddress: string, ABI: any, library: Web3Provider, account?: string): Contract => {
  if (!isAddress(tokenAddress) || tokenAddress === NULL_ADDRESS) {
    throw Error(`Invalid 'address' parameter '${tokenAddress}'.`);
  }
  return new Contract(tokenAddress, ABI, getProviderOrSigner(library, account) as any);
};

const getAmmFactoryContract = (library: Web3Provider, address: string, account?: string): AMMFactory => {
  return AMMFactory__factory.connect(address, getProviderOrSigner(library, account));
};

const getRewardContract = (library: Web3Provider, address: string, account?: string): MasterChef => {
  return MasterChef__factory.connect(address, getProviderOrSigner(library, account));
};

export const faucetUSDC = async (library: Web3Provider, account?: string) => {
  const { marketFactories } = PARA_CONFIG;
  const usdcContract = marketFactories[0].collateral;
  const amount = ethers.BigNumber.from(10).pow(10); // 10k
  const collateral = Cash__factory.connect(usdcContract, getProviderOrSigner(library, account));
  await collateral.faucet(String(amount));
};

const getMarketFactoryContract = (
  library: Web3Provider,
  marketFactoryData: MarketFactory,
  account?: string
): MarketFactoryContract => {
  return instantiateMarketFactory(
    marketFactoryData.type,
    marketFactoryData.subtype,
    marketFactoryData.address,
    getProviderOrSigner(library, account)
  );
};

const getAbstractMarketFactoryContract = (
  library: Web3Provider,
  address: string,
  account?: string
): AbstractMarketFactoryV2 => {
  return AbstractMarketFactoryV2__factory.connect(address, getProviderOrSigner(library, account));
};

const getBalancerPoolContract = (library: Web3Provider, address: string, account?: string): BPool => {
  return BPool__factory.connect(address, getProviderOrSigner(library, account));
};

// returns null on errors
export const getErc20Contract = (tokenAddress: string, library: Web3Provider, account: string): Contract | null => {
  if (!tokenAddress || !library) return null;
  try {
    return getContract(tokenAddress, ERC20ABI, library, account);
  } catch (error) {
    console.error("Failed to get contract", error);
    return null;
  }
};

export const getErc1155Contract = (tokenAddress: string, library: Web3Provider, account: string): Contract | null => {
  if (!tokenAddress || !library) return null;
  try {
    return getContract(tokenAddress, ParaShareTokenABI, library, account);
  } catch (error) {
    console.error("Failed to get contract", error);
    return null;
  }
};

export const getERC20Allowance = async (
  tokenAddress: string,
  provider: Web3Provider,
  account: string,
  spender: string
): Promise<string> => {
  const contract = getErc20Contract(tokenAddress, provider, account);
  const result = await contract.allowance(account, spender);
  const allowanceAmount = String(new BN(String(result)));
  return allowanceAmount;
};

export const getERC1155ApprovedForAll = async (
  tokenAddress: string,
  provider: Web3Provider,
  account: string,
  spender: string
): Promise<boolean> => {
  const contract = getErc1155Contract(tokenAddress, provider, account);
  const isApproved = await contract.isApprovedForAll(account, spender);
  return Boolean(isApproved);
};

const rewardsSupported = (ammFactories: string[]): string[] => {
  // filter out amm factories that don't support rewards, use new flag to determine if amm factory gives rewards
  const rewardable = marketFactories()
    .filter((m) => m.hasRewards)
    .map((m) => m.ammFactory);
  return ammFactories.filter((m) => rewardable.includes(m));
};

export const getRewardsContractAddress = (marketFactoryAddress: string) => {
  // filter out amm factories that don't support rewards, use new flag to determine if amm factory gives rewards
  const marketFactory = marketFactories().find((m) => isSameAddress(m.address, marketFactoryAddress) && m.hasRewards);
  return marketFactory?.masterChef;
};

// adding constants here with special logic
const SUB_OLD_VERSION = "V1";

export const canAddLiquidity = (market: MarketInfo): boolean => {
  const initLiquidity = !market?.amm?.id;
  if (!initLiquidity) return true;
  const data = getMarketFactoryData(market.marketFactoryAddress);
  return data?.subtype !== SUB_OLD_VERSION;
};

const marketFactories = (loadtype: string = MARKET_LOAD_TYPE.SIMPLIFIED): MarketFactory[] =>
  loadtype === MARKET_LOAD_TYPE.SPORT
    ? PARA_CONFIG.marketFactories.filter((c) => c.type !== MARKET_FACTORY_TYPES.CRYPTO)
    : PARA_CONFIG.marketFactories;

export const getMarketFactoryData = (marketFactoryAddress: string): MarketFactory => {
  const factory = marketFactories().find((m) => m.address.toLowerCase() === marketFactoryAddress.toLowerCase());
  if (!factory) return null;
  return factory;
};

export const ammFactoryMarketNames = (): MarketFactoryNames =>
  PARA_CONFIG.marketFactories.reduce((p, factory) => {
    const isSportsLink = factory.type === MARKET_FACTORY_TYPES.SPORTSLINK;
    return {
      ...p,
      [factory.ammFactory]: isSportsLink ? "NBA & MLB" : factory.description.toUpperCase(),
    };
  }, {});

// stop updating resolved markets
const addToIgnoreList = (
  ignoreList: { [factory: string]: number[] },
  factoryAddress: string,
  marketIndexs: number[]
) => {
  const address = factoryAddress.toUpperCase();
  const factoryList = ignoreList[address] || [];
  const filtered = marketIndexs.filter((i) => !factoryList.includes(i));
  ignoreList[address] = [...factoryList, ...filtered];
};

export const getMarketInfos = async (
  provider: Web3Provider,
  markets: MarketInfos,
  ammExchanges: AmmExchanges,
  account: string,
  ignoreList: { [factory: string]: number[] },
  loadtype: string = MARKET_LOAD_TYPE.SIMPLIFIED,
  blocknumber: number
): Promise<{ markets: MarketInfos; ammExchanges: AmmExchanges; blocknumber: number }> => {
  const factories = marketFactories(loadtype);

  // TODO: currently filtering out market factories that don't have rewards
  const allMarkets = await Promise.all(
    factories.filter((f) => f.hasRewards).map((config) => fetcherMarketsPerConfig(config, provider, account))
  );

  // first market infos get all markets with liquidity
  const aMarkets = allMarkets.reduce((p, data) => ({ ...p, ...data.markets }), {});
  let filteredMarkets = { ...markets, ...aMarkets };
  const newBlocknumber = allMarkets.reduce((p, data) => (p > data.blocknumber ? p : data.blocknumber), 0);

  if (Object.keys(ignoreList).length === 0) {
    filteredMarkets = setIgnoreRemoveMarketList(filteredMarkets, ignoreList, loadtype);
  }

  const exchanges = Object.values(filteredMarkets as MarketInfos).reduce((p, m) => ({ ...p, [m.marketId]: m.amm }), {});
  return { markets: filteredMarkets, ammExchanges: exchanges, blocknumber: newBlocknumber };
};

const setIgnoreRemoveMarketList = (
  allMarkets: MarketInfos,
  ignoreList: { [factory: string]: number[] },
  loadtype: string = MARKET_LOAD_TYPE.SIMPLIFIED
): MarketInfos => {
  // <Removal> resolved markets with no liquidity
  const nonLiqResolvedMarkets = Object.values(allMarkets).filter((m) => !m?.amm?.hasLiquidity && m?.hasWinner);

  // <Removal> speard marketw with zero line
  const zeroSpreadMarkets = Object.values(allMarkets).filter(
    (m) => m?.sportsMarketType === SPORTS_MARKET_TYPE.SPREAD && m?.spreadLine === 0 && m.amm.hasLiquidity === false
  );
  // <Removal> MLB spread and over/under
  // <Removal> for sportsbook removing crypto
  const ignoredSportsMarkets = Object.values(allMarkets).filter((m) =>
    isIgnoredMarket(m?.sportId, m?.sportsMarketType)
  );

  const ignoredCrypto =
    loadtype === MARKET_LOAD_TYPE.SPORT
      ? Object.values(allMarkets).filter(({ marketFactoryType }) => marketFactoryType === MARKET_FACTORY_TYPES.CRYPTO)
      : [];

  // <Removal> summer nba open markets
  // TODO: need to allow when NBA season comes around again
  const openNbaV1Markets = Object.values(allMarkets).filter(
    (m) => isIgnoreOpendMarket(m?.sportId, m?.sportsMarketType) && !m.hasWinner
  );

  const ignoreRemovedMarkets = [
    ...ignoredCrypto,
    ...nonLiqResolvedMarkets,
    ...zeroSpreadMarkets,
    ...ignoredSportsMarkets,
    ...openNbaV1Markets,
  ].reduce((p, m) => ({ ...p, [m.marketFactoryAddress]: [...(p[m.marketFactoryAddress] || []), m.turboId] }), {});

  Object.keys(ignoreRemovedMarkets).forEach((factoryAddress) =>
    addToIgnoreList(ignoreList, factoryAddress, ignoreRemovedMarkets[factoryAddress] || [])
  );

  const filteredMarkets = Object.keys(allMarkets).reduce(
    (p, id) =>
      (ignoreRemovedMarkets[allMarkets[id].marketFactoryAddress] || []).includes(allMarkets[id].turboId)
        ? p
        : { ...p, [id]: allMarkets[id] },
    {}
  );

  // <Ignore> resolved markets
  Object.values(filteredMarkets as MarketInfos)
    .filter((m) => m.hasWinner)
    .forEach((m) => addToIgnoreList(ignoreList, m.marketFactoryAddress, [m.turboId]));

  return filteredMarkets;
};

let ABIs = {};
function extractABI(contract: ethers.Contract): any[] {
  if (!contract) {
    console.error("contract is null");
    return null;
  }
  const { address } = contract;
  const abi = ABIs[address];
  if (abi) return abi;

  // Interface.format returns a JSON-encoded string of the ABI when using FormatTypes.json.
  const contractAbi = JSON.parse(contract.interface.format(ethers.utils.FormatTypes.json) as string);
  ABIs[address] = contractAbi;
  return contractAbi;
}

let defaultMaticPrice = 1.34;
export const getMaticUsdPrice = async (library: Web3Provider = null): Promise<number> => {
  if (!library) return defaultMaticPrice;
  const network = await library?.getNetwork();
  if (network?.chainId !== POLYGON_NETWORK) return defaultMaticPrice;
  try {
    const contract = getContract(POLYGON_PRICE_FEED_MATIC, PriceFeedABI, library);
    const data = await contract.latestRoundData();
    defaultMaticPrice = new BN(String(data?.answer)).div(new BN(10).pow(Number(8))).toNumber();
    // get price
  } catch (error) {
    console.error(`Failed to get price feed contract, using ${defaultMaticPrice}`);
    return defaultMaticPrice;
  }
  return defaultMaticPrice;
};
