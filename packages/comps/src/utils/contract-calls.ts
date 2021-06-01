// @ts-nocheck
import BigNumber, { BigNumber as BN } from "bignumber.js";
import {
  AmmExchange,
  AmmExchanges,
  AmmMarketShares,
  Cashes,
  CurrencyBalance,
  PositionBalance,
  UserBalances,
  MarketInfos,
  LPTokens,
  EstimateTradeResult,
  Cash,
  LiquidityBreakdown,
  AmmOutcome,
  AllMarketsTransactions,
  BuySellTransactions,
  MarketTransactions,
  AddRemoveLiquidity,
  ClaimWinningsTransactions,
  UserClaimTransactions,
} from "../types";
import { ethers } from "ethers";
import { Contract } from "@ethersproject/contracts";
import { Multicall, ContractCallResults, ContractCallContext } from "@augurproject/ethereum-multicall";
import { TransactionResponse, Web3Provider } from "@ethersproject/providers";
import {
  convertDisplayCashAmountToOnChainCashAmount,
  convertDisplayShareAmountToOnChainShareAmount,
  convertOnChainCashAmountToDisplayCashAmount,
  isSameAddress,
  lpTokensOnChainToDisplay,
  sharesOnChainToDisplay,
  sharesDisplayToOnChain,
  cashOnChainToDisplay,
  lpTokenPercentageAmount,
} from "./format-number";
import {
  ETH,
  NULL_ADDRESS,
  USDC,
  NO_CONTEST_OUTCOME_ID,
  MARKET_STATUS,
  NUM_TICKS_STANDARD,
  DEFAULT_AMM_FEE_RAW,
  TradingDirection,
  DUST_POSITION_AMOUNT,
  DUST_POSITION_AMOUNT_ON_CHAIN,
  DUST_LIQUIDITY_AMOUNT,
  DAYS_IN_YEAR,
  SEC_IN_DAY,
  ZERO,
  SPORTS_MARKET_TYPE,
} from "./constants";
import { getProviderOrSigner } from "../components/ConnectAccount/utils";
import { createBigNumber } from "./create-big-number";
import { PARA_CONFIG } from "../stores/constants";
import ERC20ABI from "./ERC20ABI.json";
import BPoolABI from "./BPoolABI.json";
import ParaShareTokenABI from "./ParaShareTokenABI.json";
import {
  AMMFactory,
  AMMFactory__factory,
  Cash__factory,
  BPool,
  BPool__factory,
  SportsLinkMarketFactory,
  AbstractMarketFactory,
  SportsLinkMarketFactory__factory,
  AbstractMarketFactory__factory,
  calcSellCompleteSets,
  estimateBuy,
} from "@augurproject/smart";
import { getFullTeamName, getSportCategories, getSportId } from "./team-helpers";
import { getOutcomeName, getMarketTitle } from "./derived-market-data";

const trimDecimalValue = (value: string | BigNumber) => createBigNumber(value).toFixed(6);
interface LiquidityProperties {
  account: string;
  amm: AmmExchange;
  marketId: string;
  cash: Cash;
  fee: string;
  amount: string;
  priceNo: string;
  priceYes: string;
  symbols: string[];
}

export const checkConvertLiquidityProperties = (
  account: string,
  marketId: string,
  amount: string,
  fee: string,
  outcomes: AmmOutcome[],
  cash: Cash,
  amm: AmmExchange
): LiquidityProperties => {
  if (!account || !marketId || !amount || !outcomes || outcomes.length === 0 || !cash) return false;
  if (amount === "0" || amount === "0.00") return false;
  if (Number(fee) < 0) return false;

  return true;
};

export async function estimateAddLiquidityPool(
  account: string,
  provider: Web3Provider,
  amm: AmmExchange,
  cash: Cash,
  cashAmount: string,
  outcomes: AmmOutcome[]
): Promise<LiquidityBreakdown> {
  if (!provider) console.error("provider is null");
  const ammFactoryContract = getAmmFactoryContract(provider, account);
  const { weights, amount, marketFactoryAddress, turboId } = shapeAddLiquidityPool(amm, cash, cashAmount, outcomes);
  const ammAddress = amm?.id;

  let results = null;
  let tokenAmount = "0";
  let minAmounts = [];
  let minAmountsRaw = [];
  let poolPct = "0";

  if (!ammAddress) {
    console.log("est add init", marketFactoryAddress, turboId, amount, weights, account);
    results = await ammFactoryContract.callStatic.createPool(marketFactoryAddress, turboId, amount, weights, account);
    tokenAmount = trimDecimalValue(sharesOnChainToDisplay(String(results || "0")));
  } else {
    // todo: get what the min lp token out is
    console.log("est add additional", marketFactoryAddress, "marketId", turboId, "amount", amount, 0, account);

    results = await ammFactoryContract.callStatic.addLiquidity(marketFactoryAddress, turboId, amount, 0, account);
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
      poolPct = lpTokenPercentageAmount(tokenAmount, poolSupply);
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
  const ammFactoryContract = getAmmFactoryContract(provider, account);
  const { weights, amount, marketFactoryAddress, turboId } = shapeAddLiquidityPool(amm, cash, cashAmount, outcomes);
  const ammAddress = amm?.id;
  const minLpTokenAllowed = "0"; //sharesDisplayToOnChain(minLptokenAmount).toFixed();
  let tx = null;
  console.log(
    !ammAddress ? "add init liquidity:" : "add additional liquidity",
    marketFactoryAddress,
    turboId,
    "amount",
    amount,
    "weights",
    weights,
    "min",
    minLpTokenAllowed
  );
  if (!ammAddress) {
    tx = ammFactoryContract.createPool(marketFactoryAddress, turboId, amount, weights, account, {
      // gasLimit: "800000",
      // gasPrice: "10000000000",
    });
  } else {
    // todo: get what the min lp token out is
    tx = ammFactoryContract.addLiquidity(marketFactoryAddress, turboId, amount, minLpTokenAllowed, account, {
      // gasLimit: "800000",
      // gasPrice: "10000000000",
    });
  }

  return tx;
}

function shapeAddLiquidityPool(amm: AmmExchange, cash: Cash, cashAmount: string, outcomes: AmmOutcome[]): {} {
  const ammAddress = amm?.id;
  const { marketFactoryAddress, turboId } = amm;
  const amount = convertDisplayCashAmountToOnChainCashAmount(cashAmount, cash.decimals).toFixed();
  let weights = [];
  if (!ammAddress) {
    weights = calcWeights(outcomes.map((o) => o.price));
  }
  return {
    marketFactoryAddress,
    turboId,
    weights,
    amount,
  };
}

// TODO: when new ammFactory is done use standard weights.
// creating weights at mid range for outcomes and 2% for no contest outcome
// will see if this approach will help against trolling initial LPs
// const defaultPriceWeights = ["0.02", "0.49", "0.49"];
const calcWeights = (prices: string[]): string[] => {
  const totalWeight = new BN(50);
  const multiplier = new BN(10).pow(new BN(18));
  const results = prices.map((price) => new BN(price).times(totalWeight).times(multiplier).toFixed());
  return results;
};

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
  const ammFactory = getAmmFactoryContract(provider, account);

  // balancer lp tokens are 18 decimal places
  const lpBalance = convertDisplayCashAmountToOnChainCashAmount(lpTokenBalance, 18).toFixed();
  let results = null;
  let minAmounts = null;
  let minAmountsRaw = null;
  let collateralOut = "0";

  if (!hasWinner) {
    results = await ammFactory.callStatic
      .removeLiquidity(market.marketFactoryAddress, market.turboId, lpBalance, "0", account) // uint256[] calldata minAmountsOut values be?
      .catch((e) => console.log(e));
    const { _balances, _collateralOut } = results;
    collateralOut = _collateralOut;
    minAmounts = _balances.map((v, i) => ({
      amount: lpTokensOnChainToDisplay(String(v)).toFixed(),
      outcomeId: i,
      hide: lpTokensOnChainToDisplay(String(v)).lt(DUST_POSITION_AMOUNT),
    }));
    minAmountsRaw = _balances.map((v) => new BN(String(v)).toFixed());
  } else {
    results = await estimateLPTokenInShares(amm?.id, provider, lpTokenBalance, account, amm?.ammOutcomes).catch((e) =>
      console.log(e)
    );
    const minAmts = amm?.ammOutcomes.map((o, i) => ({
      amount: results.minAmounts[i],
      outcomeId: i,
      hide: new BN(results.minAmounts[i]).lt(DUST_POSITION_AMOUNT),
    }));
    minAmounts = minAmts;
    minAmountsRaw = results.minAmountsRaw;
  }

  if (!results) return null;

  const amount = cashOnChainToDisplay(String(collateralOut), cash.decimals).toFixed();
  const poolPct = lpTokenPercentageAmount(lpTokenBalance, lpTokensOnChainToDisplay(amm?.totalSupply || "1"));

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
    .catch((e) => console.log(e));

  if (!results) return null;
  const minAmounts: string[] = results.map((v) => lpTokensOnChainToDisplay(String(v)).toFixed());
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
  const ammFactory = getAmmFactoryContract(provider, account);
  const lpBalance = convertDisplayCashAmountToOnChainCashAmount(lpTokenBalance, 18).toFixed();
  const balancerPool = getBalancerPoolContract(provider, amm?.id, account);

  return hasWinner
    ? balancerPool.exitPool(lpBalance, amountsRaw)
    : ammFactory.removeLiquidity(market.marketFactoryAddress, market.turboId, lpBalance, "0", account);
}

export const estimateBuyTrade = async (
  amm: AmmExchange,
  provider: Web3Provider,
  inputDisplayAmount: string,
  selectedOutcomeId: number,
  cash: Cash
): Promise<EstimateTradeResult | null> => {
  if (!provider) {
    console.error("doRemoveLiquidity: no provider");
    return null;
  }
  const { marketFactoryAddress, turboId } = amm;

  const amount = convertDisplayCashAmountToOnChainCashAmount(inputDisplayAmount, cash.decimals).toFixed();
  console.log(
    "estimate buy",
    "address",
    marketFactoryAddress,
    "turboId",
    turboId,
    "outcome",
    selectedOutcomeId,
    "amount",
    amount,
    0
  );
  let result = null;
  try {
    result = await estimateBuy(amm.shareFactor, selectedOutcomeId, amount, amm.balancesRaw, amm.weights, amm.feeRaw);
  } catch (e) {
    console.log("error in estimate buy", e);
  }

  if (!result) return null;

  const estimatedShares = sharesOnChainToDisplay(String(result));
  const tradeFees = String(new BN(inputDisplayAmount).times(new BN(amm.feeDecimal)));
  const averagePrice = new BN(inputDisplayAmount).div(new BN(estimatedShares));
  const maxProfit = String(new BN(estimatedShares).minus(new BN(inputDisplayAmount)));
  const price = new BN(amm.ammOutcomes[selectedOutcomeId]?.price);
  const priceImpact = price.minus(averagePrice).times(100).toFixed(4);
  const ratePerCash = new BN(estimatedShares).div(new BN(inputDisplayAmount)).toFixed(6);
  console.log("est shares", String(estimatedShares), "avg price", String(averagePrice), "outcome price", String(price));

  return {
    outputValue: trimDecimalValue(estimatedShares),
    tradeFees,
    averagePrice: averagePrice.toFixed(2),
    maxProfit,
    ratePerCash,
    priceImpact,
  };
};

export const estimateSellTrade = async (
  amm: AmmExchange,
  provider: Web3Provider,
  inputDisplayAmount: string,
  selectedOutcomeId: number,
  userBalances: string[]
): Promise<EstimateTradeResult | null> => {
  if (!provider) {
    console.error("estimateSellTrade: no provider");
    return null;
  }
  const { marketFactoryAddress, turboId } = amm;
  const amount = sharesDisplayToOnChain(inputDisplayAmount).toFixed();
  console.log(
    "estimate sell",
    "factory",
    marketFactoryAddress,
    "turboId",
    turboId,
    "outcome id",
    selectedOutcomeId,
    "amount",
    amount,
    "inputDisplayAmount",
    inputDisplayAmount,
    "shareTokens",
    amm.ammOutcomes,
    "share factor",
    amm.shareFactor
  );

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
  const tradeFees = String(new BN(inputDisplayAmount).times(new BN(amm.feeDecimal)));

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
  const ammFactoryContract = getAmmFactoryContract(provider, account);
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
      min = "0.01"; // set to 1 cent until estimate gets worked out.
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
  if (!provider) return console.error("claimWinnings: no provider");
  const marketFactoryContract = getAbstractMarketFactoryContract(provider, factoryAddress, account);
  return marketFactoryContract.claimManyWinnings(marketIds, account);
};

export const claimFees = (
  account: string,
  provider: Web3Provider,
  factoryAddress: string
): Promise<TransactionResponse | null> => {
  if (!provider) return console.error("claimFees: no provider");
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
  if (!provider) return console.error("cashOutAllShares: no provider");
  const marketFactoryContract = getAbstractMarketFactoryContract(provider, factoryAddress, account);
  const shareAmount = BigNumber.min(...balancesRaw);
  const normalizedAmount = shareAmount
    .div(new BN(shareFactor))
    .decimalPlaces(0, 1)
    .times(new BN(shareFactor))
    .decimalPlaces(0, 1);
  console.log("share to cash out", shareAmount.toFixed(), marketId, normalizedAmount.toFixed(), account);
  return marketFactoryContract.burnShares(marketId, normalizedAmount.toFixed(), account, {
    gasLimit: "800000",
    gasPrice: "10000000000",
  });
};

export const getCompleteSetsAmount = (outcomeShares: string[]): string => {
  const shares = (outcomeShares || []).map((s, i) => new BN(outcomeShares[i] || "0"));
  const amount = BigNumber.min(...shares);
  if (isNaN(amount.toFixed())) return "0";
  const isDust = amount.lte(DUST_POSITION_AMOUNT);
  return isDust ? "0" : amount.toFixed();
};

export const getUserBalances = async (
  provider: Web3Provider,
  account: string,
  ammExchanges: AmmExchanges,
  cashes: Cashes,
  markets: MarketInfos,
  transactions: AllMarketsTransactions
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
    claimableFees: "0",
  };

  if (!account || !provider) return userBalances;

  const userMarketTransactions = getUserTransactions(transactions, account);
  const userClaims = transactions as UserClaimTransactions;
  const BALANCE_OF = "balanceOf";
  const LP_TOKEN_COLLECTION = "lpTokens";
  const MARKET_SHARE_COLLECTION = "marketShares";
  // finalized markets
  const finalizedMarkets = Object.values(markets).filter((m) => m.reportingState === MARKET_STATUS.FINALIZED);
  const finalizedMarketIds = finalizedMarkets.map((f) => f.marketId);
  const finalizedAmmExchanges = Object.values(ammExchanges).filter((a) => finalizedMarketIds.includes(a.marketId));

  // balance of
  const exchanges = Object.values(ammExchanges).filter((e) => e.id && e.totalSupply !== "0");
  const allExchanges = Object.values(ammExchanges).filter((e) => e.id);
  userBalances.ETH = await getEthBalance(provider, cashes, account);

  const multicall = new Multicall({ ethersProvider: provider });
  const contractLpBalanceCall: ContractCallContext[] = exchanges.map((exchange) => ({
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
          marketid: exchange.marketId,
          totalSupply: exchange?.totalSupply,
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
  const usdc = Object.values(cashes).find((c) => c.name === USDC);

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
  // need different calls to get lp tokens and market share balances
  const balanceCalls = [...basicBalanceCalls, ...contractMarketShareBalanceCall, ...contractLpBalanceCall];
  const balanceResult: ContractCallResults = await multicall.call(balanceCalls);

  for (let i = 0; i < Object.keys(balanceResult.results).length; i++) {
    const key = Object.keys(balanceResult.results)[i];
    const method = String(balanceResult.results[key].originalContractCallContext.calls[0].methodName);
    const balanceValue = balanceResult.results[key].callsReturnContext[0].returnValues[0] as ethers.utils.Result;
    const context = balanceResult.results[key].originalContractCallContext.calls[0].context;
    const rawBalance = new BN(balanceValue._hex).toFixed();
    const { dataKey, collection, decimals, marketId, outcomeId, totalSupply } = context;
    const balance = convertOnChainCashAmountToDisplayCashAmount(new BN(rawBalance), new BN(decimals));

    if (method === BALANCE_OF) {
      if (!collection) {
        userBalances[dataKey] = {
          balance: balance.toFixed(),
          rawBalance: rawBalance,
          usdValue: balance.toFixed(),
        };
      } else if (collection === LP_TOKEN_COLLECTION) {
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
      } else if (collection === MARKET_SHARE_COLLECTION) {
        const fixedShareBalance = sharesOnChainToDisplay(new BN(rawBalance)).toFixed();
        // todo: re organize balances to be really simple (future)
        // can index using dataKey (shareToken)
        //userBalances[collection][dataKey] = { balance: fixedBalance, rawBalance, marketId };

        // shape AmmMarketShares
        const existingMarketShares = userBalances.marketShares[marketId];
        const marketTransactions = userMarketTransactions[marketId];
        const exchange = ammExchanges[marketId];
        if (existingMarketShares) {
          const position = getPositionUsdValues(
            marketTransactions,
            rawBalance,
            fixedShareBalance,
            outcomeId,
            exchange,
            account,
            userClaims
          );
          if (position) userBalances.marketShares[marketId].positions.push(position);
          userBalances.marketShares[marketId].outcomeSharesRaw[outcomeId] = rawBalance;
          userBalances.marketShares[marketId].outcomeShares[outcomeId] = fixedShareBalance;
        } else if (fixedShareBalance !== "0") {
          userBalances.marketShares[marketId] = {
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
            userClaims
          );
          if (position) userBalances.marketShares[marketId].positions.push(position);
          userBalances.marketShares[marketId].outcomeSharesRaw[outcomeId] = rawBalance;
          userBalances.marketShares[marketId].outcomeShares[outcomeId] = fixedShareBalance;
        }
      }
    }
  }

  if (finalizedMarkets.length > 0) {
    const keyedFinalizedMarkets = finalizedMarkets.reduce((p, f) => ({ ...p, [f.marketId]: f }), {});
    populateClaimableWinnings(keyedFinalizedMarkets, finalizedAmmExchanges, userBalances.marketShares);
  }

  const userPositions = getTotalPositions(userBalances.marketShares);
  const availableFundsUsd = String(new BN(userBalances.USDC.usdValue));
  const totalAccountValue = String(new BN(availableFundsUsd).plus(new BN(userPositions.totalPositionUsd)));
  await populateInitLPValues(userBalances.lpTokens, provider, ammExchanges, account);

  return { ...userBalances, ...userPositions, totalAccountValue, availableFundsUsd };
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
  marketTransactions: MarketTransactions,
  rawBalance: string,
  balance: string,
  outcome: string,
  amm: AmmExchange,
  account: string,
  userClaims: UserClaimTransactions
): PositionBalance => {
  let past24hrUsdValue = null;
  let change24hrPositionUsd = null;
  let avgPrice = "0";
  let initCostUsd = "0";
  let totalChangeUsd = "0";
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
  const estimate = await estimateLPTokenInShares(
    amm.id,
    provider,
    displayBalance,
    account,
    amm.ammOutcomes
  ).catch((error) => console.error("getLPCurrentValue estimation error", error));

  if (estimate && estimate.minAmountsRaw) {
    const totalValueRaw = ammOutcomes.reduce((p, v, i) => p.plus(new BN(estimate.minAmounts[i]).times(v.price)), ZERO);

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

const getUserTransactions = (transactions: AllMarketsTransactions, account: string): AllMarketsTransactions => {
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
  marketTransactions: MarketTransactions,
  amm: AmmExchange,
  outcome: string,
  account: string,
  userClaims: UserClaimTransactions
): { avgPrice: string; positionFromAddLiquidity: boolean; positionFromRemoveLiquidity: boolean } => {
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

  return {
    avgPrice: String(weightedAvgPrice),
    positionFromAddLiquidity,
    positionFromRemoveLiquidity,
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
  outcomeDefaultAvgPrice: string
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
  transactions: MarketTransactions = {},
  hasWinner: boolean = false
): { apy: string; vol: string; vol24hr: string } => {
  const defaultValues = { apy: undefined, vol: null, vol24hr: null };
  if (!amm?.id || (transactions?.addLiquidity || []).length === 0) return defaultValues;

  const { feeDecimal, liquidityUSD, cash } = amm;

  const timestamp24hr = Math.floor(new Date().getTime() / 1000 - SEC_IN_DAY);
  // calc total volume
  const volumeTotalUSD = calcTotalVolumeUSD(transactions, cash).toNumber();
  const volumeTotalUSD24hr = calcTotalVolumeUSD(transactions, cash, timestamp24hr).toNumber();

  const sortedAddLiquidity = (transactions?.addLiquidity || []).sort((a, b) =>
    Number(a.timestamp) > Number(b.timestamp) ? 1 : -1
  );
  const startTimestamp = Number(sortedAddLiquidity[0].timestamp);

  if (volumeTotalUSD === 0 || startTimestamp === 0 || feeDecimal === "0") return defaultValues;

  const totalFeesInUsd = new BN(volumeTotalUSD).times(new BN(feeDecimal));
  const currTimestamp = Math.floor(new Date().getTime() / 1000); // current time in unix timestamp
  const secondsPast = currTimestamp - startTimestamp;
  const pastDays = Math.floor(new BN(secondsPast).div(SEC_IN_DAY).toNumber());

  const tradeFeeLiquidityPerDay = new BN(liquidityUSD).lte(DUST_LIQUIDITY_AMOUNT)
    ? null
    : totalFeesInUsd.div(new BN(liquidityUSD)).div(new BN(pastDays || 1));

  const tradeFeePerDayInYear =
    hasWinner || !tradeFeeLiquidityPerDay
      ? undefined
      : tradeFeeLiquidityPerDay.times(DAYS_IN_YEAR).abs().times(100).toFixed(4);
  return { apy: tradeFeePerDayInYear, vol: volumeTotalUSD, vol24hr: volumeTotalUSD24hr };
};

const calcTotalVolumeUSD = (transactions: MarketTransactions, cash: Cash, cutoffTimestamp: number = 0) => {
  const { trades } = transactions;
  const totalCollateral = (trades || []).reduce(
    (p, b) => (b.timestamp > cutoffTimestamp ? p.plus(new BN(b.collateral).abs()) : p),
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

const getAmmFactoryContract = (library: Web3Provider, account?: string): AMMFactory => {
  const { ammFactory } = PARA_CONFIG;
  return AMMFactory__factory.connect(ammFactory, getProviderOrSigner(library, account));
};

export const faucetUSDC = async (library: Web3Provider, account?: string) => {
  const { marketFactories } = PARA_CONFIG;
  const usdcContract = marketFactories.sportsball.collateral;
  const amount = ethers.BigNumber.from(10).pow(10); // 10k
  const collateral = Cash__factory.connect(usdcContract, getProviderOrSigner(library, account));
  await collateral.faucet(amount as BigNumberish);
};

const getMarketFactoryContract = (
  library: Web3Provider,
  address: string,
  account?: string
): SportsLinkMarketFactory => {
  return SportsLinkMarketFactory__factory.connect(address, getProviderOrSigner(library, account));
};

const getAbstractMarketFactoryContract = (
  library: Web3Provider,
  address: string,
  account?: string
): AbstractMarketFactory => {
  return AbstractMarketFactory__factory.connect(address, getProviderOrSigner(library, account));
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

const marketFactories = () => {
  const { marketFactories } = PARA_CONFIG;
  const marketAddresses = [marketFactories.sportsball.address];
  // make sure sportsball2 exists in addresses before trying to add
  if (marketFactories?.sportsball2?.address) {
    marketAddresses.push(marketFactories.sportsball2.address);
  }
  // TODO: add in MMA when there are real mma markets
  /*
  if (marketFactories?.mma?.address) {
    marketAddresses.push(marketFactories.mma.address);
  }
  */
  return marketAddresses;
};

// stop updating resolved markets
const IgnoreResolvedMarketsList = {};
const addResolvedMarketToList = (factoryAddress: string, marketIndex: string | number) => {
  const address = factoryAddress.toUpperCase();
  const factoryList = IgnoreResolvedMarketsList[address];
  if (factoryList && !factoryList.includes(marketIndex))
    return (IgnoreResolvedMarketsList[address] = IgnoreResolvedMarketsList[address] = [
      ...IgnoreResolvedMarketsList[address],
      Number(marketIndex),
    ]);
  IgnoreResolvedMarketsList[address] = [marketIndex];
};

export const getMarketInfos = async (
  provider: Web3Provider,
  markets: MarketInfos,
  ammExchanges: AmmExchanges,
  cashes: Cashes,
  account: string
): { markets: MarketInfos; ammExchanges: AmmExchanges; blocknumber: number; loading: boolean } => {
  const factories = marketFactories();
  const allMarkets = await Promise.all(
    factories.map((address) => getFactoryMarketInfo(provider, markets, cashes, account, address))
  );

  // first market infos get all markets with liquidity
  const marketInfos = allMarkets.reduce(
    (p, { markets: marketInfos, ammExchanges: exchanges, blocknumber }, i) => {
      // only take liquidity markets from first batch
      if (i === 0) {
        const hasLiquidityMarketIndexes: number[] = Object.keys(exchanges).reduce(
          (p, id) => (exchanges[id]?.hasLiquidity ? [...p, exchanges[id].turboId] : p),
          []
        );
        const liquidityMarkets = Object.keys(marketInfos).reduce(
          (p, id) =>
            hasLiquidityMarketIndexes.includes(marketInfos[id].turboId) ? { ...p, [id]: marketInfos[id] } : p,
          {}
        );
        const liquidityExchanges = Object.keys(exchanges).reduce(
          (p, id) => (hasLiquidityMarketIndexes.includes(exchanges[id].turboId) ? { ...p, [id]: exchanges[id] } : p),
          {}
        );
        return {
          markets: { ...p.markets, ...liquidityMarkets },
          ammExchanges: { ...p.ammExchanges, ...liquidityExchanges },
          blocknumber,
        };
      }
      const existingMarkets: number[] = Object.keys(p.markets).map((id) => p.markets[id]?.turboId);
      const newMarkets = Object.keys(marketInfos).reduce(
        (p, id) => (!existingMarkets.includes(marketInfos[id].turboId) ? { ...p, [id]: marketInfos[id] } : p),
        {}
      );
      const newExchanges = Object.keys(exchanges).reduce(
        (p, id) => (!existingMarkets.includes(exchanges[id].turboId) ? { ...p, [id]: exchanges[id] } : p),
        {}
      );

      return {
        markets: { ...p.markets, ...newMarkets },
        ammExchanges: { ...p.ammExchanges, ...newExchanges },
        blocknumber,
      };
    },
    { markets, ammExchanges, blocknumber: null, loading: false }
  );

  const { markets: filterMarkets } = marketInfos;

  // only update open markets after initial load
  Object.keys(filterMarkets)
    .filter((id) => filterMarkets[id]?.hasWinner)
    .forEach((id) => addResolvedMarketToList(filterMarkets[id]?.marketFactoryAddress, filterMarkets[id]?.turboId));

  return marketInfos;
};

export const getFactoryMarketInfo = async (
  provider: Web3Provider,
  markets: MarketInfos,
  cashes: Cashes,
  account: string,
  factoryAddress: string
): { markets: MarketInfos; ammExchanges: AmmExchanges; blocknumber: number; loading: boolean } => {
  const marketFactoryContract = getAbstractMarketFactoryContract(provider, factoryAddress, account);
  const numMarkets = (await marketFactoryContract.marketCount()).toNumber();

  let indexes = [];
  for (let i = 1; i < numMarkets; i++) {
    if (!IgnoreResolvedMarketsList.includes(i)) indexes.push(i);
  }

  const { marketInfos, exchanges, blocknumber } = await retrieveMarkets(
    indexes,
    cashes,
    provider,
    account,
    factoryAddress
  );
  return { markets: { ...markets, ...marketInfos }, ammExchanges: exchanges, blocknumber };
};

const retrieveMarkets = async (
  indexes: number[],
  cashes: Cashes,
  provider: Web3Provider,
  account: string,
  factoryAddress: string
): Market[] => {
  const GET_MARKETS = "getMarket";
  const GET_MARKET_DETAILS = "getMarketDetails";
  const POOLS = "pools";
  const marketFactoryContract = getMarketFactoryContract(provider, factoryAddress, account);
  const marketFactoryAddress = marketFactoryContract.address;
  const marketFactoryAbi = extractABI(marketFactoryContract);
  const ammFactory = getAmmFactoryContract(provider, account);
  const ammFactoryAddress = ammFactory.address;
  const ammFactoryAbi = extractABI(ammFactory);
  const multicall = new Multicall({ ethersProvider: provider });
  const contractMarketsCall: ContractCallContext[] = indexes.reduce(
    (p, index) => [
      ...p,
      {
        reference: `${marketFactoryAddress}-${index}`,
        contractAddress: marketFactoryAddress,
        abi: marketFactoryAbi,
        calls: [
          {
            reference: `${marketFactoryAddress}-${index}`,
            methodName: GET_MARKETS,
            methodParameters: [index],
            context: {
              index,
              marketFactoryAddress,
            },
          },
        ],
      },
      {
        reference: `${marketFactoryAddress}-${index}-details`,
        contractAddress: marketFactoryAddress,
        abi: marketFactoryAbi,
        calls: [
          {
            reference: `${marketFactoryAddress}-${index}`,
            methodName: GET_MARKET_DETAILS,
            methodParameters: [index],
            context: {
              index,
              marketFactoryAddress,
            },
          },
        ],
      },
      {
        reference: `${ammFactoryAddress}-${index}-pools`,
        contractAddress: ammFactoryAddress,
        abi: ammFactoryAbi,
        calls: [
          {
            reference: `${ammFactoryAddress}-${index}-pools`,
            methodName: POOLS,
            methodParameters: [marketFactoryAddress, index],
            context: {
              index,
              marketFactoryAddress,
            },
          },
        ],
      },
    ],
    []
  );
  let markets = [];
  const details = {};
  let exchanges = {};
  const cash = Object.values(cashes).find((c) => c.name === USDC); // todo: only supporting USDC currently, will change to multi collateral with new contract changes
  const marketsResult: ContractCallResults = await multicall.call(contractMarketsCall);
  for (let i = 0; i < Object.keys(marketsResult.results).length; i++) {
    const key = Object.keys(marketsResult.results)[i];
    const data = marketsResult.results[key].callsReturnContext[0].returnValues[0];
    const context = marketsResult.results[key].originalContractCallContext.calls[0].context;
    const method = String(marketsResult.results[key].originalContractCallContext.calls[0].methodName);
    const marketId = `${context.marketFactoryAddress.toLowerCase()}-${context.index}`;

    if (method === GET_MARKET_DETAILS) {
      details[marketId] = data;
    } else if (method === POOLS) {
      const id = data === NULL_ADDRESS ? null : data;
      exchanges[marketId] = {
        marketId,
        id,
        marketFactoryAddress,
        turboId: context.index,
        feeDecimal: "0",
        feeRaw: "0",
        feeInPercent: "0",
        transactions: [], // to be filled in the future
        trades: {}, // to be filled in the future
        cash,
      };
    } else {
      const market = decodeMarket(data);
      market.marketId = marketId;
      market.marketFactoryAddress = marketFactoryAddress;
      market.turboId = context.index;
      if (market) markets.push(market);
    }
  }

  const marketInfos = {};
  if (markets.length > 0) {
    markets.forEach((m) => {
      const marketDetails = details[m.marketId];
      marketInfos[m.marketId] = decodeMarketDetails(m, marketDetails);
    });
  }

  const blocknumber = marketsResult.blockNumber;

  if (Object.keys(exchanges).length > 0) {
    exchanges = await retrieveExchangeInfos(
      exchanges,
      marketInfos,
      marketFactoryAddress,
      ammFactory,
      provider,
      account,
      factoryAddress
    );
  }

  return { marketInfos, exchanges, blocknumber };
};

const exchangesHaveLiquidity = async (exchanges: AmmExchanges, provider: Web3Provider): Market[] => {
  const TOTAL_SUPPLY = "totalSupply";
  const multicall = new Multicall({ ethersProvider: provider });
  const ex = Object.values(exchanges).filter((k) => k.id);
  const contractMarketsCall: ContractCallContext[] = ex.map((e) => ({
    reference: `${e.id}-total-supply`,
    contractAddress: e.id,
    abi: BPoolABI,
    calls: [
      {
        reference: `${e.id}-total-supply`,
        methodName: TOTAL_SUPPLY,
        methodParameters: [],
        context: {
          marketId: e.marketId,
        },
      },
    ],
  }));
  const balances = {};
  const marketsResult: ContractCallResults = await multicall.call(contractMarketsCall);
  for (let i = 0; i < Object.keys(marketsResult.results).length; i++) {
    const key = Object.keys(marketsResult.results)[i];
    const data = marketsResult.results[key].callsReturnContext[0].returnValues[0];
    const method = String(marketsResult.results[key].originalContractCallContext.calls[0].methodName);
    const context = marketsResult.results[key].originalContractCallContext.calls[0].context;
    const marketId = context.marketId;

    if (method === TOTAL_SUPPLY) {
      balances[marketId] = data;
    }
  }

  Object.keys(exchanges).forEach((marketId) => {
    const exchange = exchanges[marketId];
    exchange.totalSupply = balances[marketId] ? String(balances[marketId]) : "0";
    exchange.hasLiquidity = exchange.totalSupply !== "0";
  });

  return exchanges;
};

const retrieveExchangeInfos = async (
  exchangesInfo: AmmExchanges,
  marketInfos: MarketInfos,
  marketFactoryAddress: string,
  ammFactory: AMMFactory,
  provider: Web3Provider,
  account: string,
  factoryAddress: string
): Market[] => {
  const exchanges = await exchangesHaveLiquidity(exchangesInfo, provider);

  const GET_RATIOS = "tokenRatios";
  const GET_BALANCES = "getPoolBalances";
  const GET_FEE = "getSwapFee";
  const GET_SHARE_FACTOR = "shareFactor";
  const GET_POOL_WEIGHTS = "getPoolWeights";
  const ammFactoryAddress = ammFactory.address;
  const ammFactoryAbi = extractABI(ammFactory);
  const multicall = new Multicall({ ethersProvider: provider });
  const existingIndexes = Object.keys(exchanges)
    .filter((k) => exchanges[k].id && exchanges[k]?.totalSupply !== "0")
    .map((k) => exchanges[k].turboId);
  const marketFactoryContract = getMarketFactoryContract(provider, factoryAddress, account);
  const marketFactoryAbi = extractABI(marketFactoryContract);
  const contractPricesCall: ContractCallContext[] = existingIndexes.reduce(
    (p, index) => [
      ...p,
      {
        reference: `${ammFactoryAddress}-${index}-ratios`,
        contractAddress: ammFactoryAddress,
        abi: ammFactoryAbi,
        calls: [
          {
            reference: `${ammFactoryAddress}-${index}-ratios`,
            methodName: GET_RATIOS,
            methodParameters: [marketFactoryAddress, index],
            context: {
              index,
              marketFactoryAddress,
            },
          },
        ],
      },
    ],
    []
  );
  const indexes = Object.keys(exchanges)
    .filter((k) => exchanges[k].id)
    .map((k) => exchanges[k].turboId);
  const contractMarketsCall: ContractCallContext[] = indexes.reduce(
    (p, index) => [
      ...p,
      {
        reference: `${ammFactoryAddress}-${index}-balances`,
        contractAddress: ammFactoryAddress,
        abi: ammFactoryAbi,
        calls: [
          {
            reference: `${ammFactoryAddress}-${index}-balances`,
            methodName: GET_BALANCES,
            methodParameters: [marketFactoryAddress, index],
            context: {
              index,
              marketFactoryAddress,
            },
          },
        ],
      },
      {
        reference: `${ammFactoryAddress}-${index}-fee`,
        contractAddress: ammFactoryAddress,
        abi: ammFactoryAbi,
        calls: [
          {
            reference: `${ammFactoryAddress}-${index}-fee`,
            methodName: GET_FEE,
            methodParameters: [marketFactoryAddress, index],
            context: {
              index,
              marketFactoryAddress,
            },
          },
        ],
      },
      {
        reference: `${ammFactoryAddress}-${index}-weights`,
        contractAddress: ammFactoryAddress,
        abi: ammFactoryAbi,
        calls: [
          {
            reference: `${ammFactoryAddress}-${index}-weights`,
            methodName: GET_POOL_WEIGHTS,
            methodParameters: [marketFactoryAddress, index],
            context: {
              index,
              marketFactoryAddress,
            },
          },
        ],
      },
    ],
    []
  );
  // need to get share factor per market factory
  const shareFactorCalls: ContractCallContext[] = [
    {
      reference: `${marketFactoryAddress}-factor`,
      contractAddress: marketFactoryAddress,
      abi: marketFactoryAbi,
      calls: [
        {
          reference: `${marketFactoryAddress}-factor`,
          methodName: GET_SHARE_FACTOR,
          methodParameters: [],
          context: {
            index: 0,
            marketFactoryAddress,
          },
        },
      ],
    },
  ];

  const ratios = {};
  const balances = {};
  const fees = {};
  const shareFactors = {};
  const poolWeights = {};
  const marketsResult: ContractCallResults = await multicall.call([
    ...contractMarketsCall,
    ...shareFactorCalls,
    ...contractPricesCall,
  ]);
  for (let i = 0; i < Object.keys(marketsResult.results).length; i++) {
    const key = Object.keys(marketsResult.results)[i];
    const data = marketsResult.results[key].callsReturnContext[0].returnValues[0];
    const context = marketsResult.results[key].originalContractCallContext.calls[0].context;
    const method = String(marketsResult.results[key].originalContractCallContext.calls[0].methodName);
    const marketId = `${context.marketFactoryAddress.toLowerCase()}-${context.index}`;

    if (method === GET_RATIOS) {
      ratios[marketId] = data;
    } else if (method === GET_SHARE_FACTOR) {
      shareFactors[context.marketFactoryAddress] = data;
    } else if (method === GET_POOL_WEIGHTS) {
      poolWeights[marketId] = data;
    } else if (method === GET_BALANCES) {
      balances[marketId] = data;
    } else if (method === GET_FEE) {
      fees[marketId] = data;
    }
  }

  Object.keys(exchanges).forEach((marketId) => {
    const exchange = exchanges[marketId];
    const outcomePrices = calculatePrices(ratios[marketId], poolWeights[marketId]);
    const market = marketInfos[marketId];
    const fee = new BN(String(fees[marketId] || DEFAULT_AMM_FEE_RAW)).toFixed();
    const balancesRaw = balances[marketId];
    const weights = poolWeights[marketId];
    const { numTicks } = market;
    exchange.ammOutcomes = market.outcomes.map((o, i) => ({
      price: exchange.id ? String(outcomePrices[i]) : "",
      ratioRaw: exchange.id ? getArrayValue(ratios[marketId], i) : "",
      ratio: exchange.id ? toDisplayRatio(getArrayValue(ratios[marketId], i)) : "",
      balanceRaw: exchange.id ? getArrayValue(balances[marketId], i) : "",
      balance: exchange.id ? toDisplayBalance(getArrayValue(balances[marketId], i), numTicks) : "",
      ...o,
    }));
    // create cross reference
    exchange.market = market;
    const feeDecimal = fee ? new BN(String(fee)).div(new BN(10).pow(18)) : "0";
    exchange.feeDecimal = fee ? feeDecimal.toFixed() : "0";
    exchange.feeInPercent = fee ? feeDecimal.times(100).toFixed() : "0";
    exchange.feeRaw = fee;
    exchange.balancesRaw = balancesRaw ? balancesRaw.map((b) => String(b)) : [];
    exchange.shareFactor = new BN(String(shareFactors[market.marketFactoryAddress])).toFixed();
    exchange.weights = weights ? weights.map((w) => String(w)) : [];
    exchange.liquidityUSD = getTotalLiquidity(outcomePrices, balancesRaw);
    market.amm = exchange;
  });

  return exchanges;
};

const getTotalLiquidity = (prices: string[], balances: string[]) => {
  if (prices.length === 0) return "0";
  const outcomeLiquidity = prices.map((p, i) =>
    new BN(p).times(new BN(toDisplayLiquidity(String(balances[i])))).toFixed()
  );
  return outcomeLiquidity.reduce((p, r) => p.plus(new BN(r)), ZERO).toFixed(4);
};

const getArrayValue = (ratios: string[] = [], outcomeId: number) => {
  if (ratios.length === 0) return "0";
  if (!ratios[outcomeId]) return "0";
  return String(ratios[outcomeId]);
};
const calculatePrices = (ratios: string[] = [], weights: string[] = []): string[] => {
  let outcomePrices = [];
  //price[0] = ratio[0] / sum(ratio)
  const base = ratios.length > 0 ? ratios : weights;
  if (base.length > 0) {
    const sum = base.reduce((p, r) => p.plus(new BN(String(r))), ZERO);
    outcomePrices = base.map((r) => new BN(String(r)).div(sum).toFixed());
  }
  return outcomePrices;
};

const decodeMarket = (marketData: any) => {
  const { shareTokens, endTime, winner, creator, settlementFee: onChainFee, creationTimestamp } = marketData;
  const winningOutcomeId: string = shareTokens.indexOf(winner);
  const hasWinner = winner !== NULL_ADDRESS;
  const reportingState = !hasWinner ? MARKET_STATUS.TRADING : MARKET_STATUS.FINALIZED;

  const creatorFee = new BN(String(onChainFee))
    .div(new BN(10).pow(new BN(18)))
    .times(100)
    .toFixed();

  return {
    endTimestamp: new BN(String(endTime)).toNumber(),
    creationTimestamp: new BN(String(creationTimestamp)).toNumber(),
    marketType: "Categorical", // categorical markets
    numTicks: NUM_TICKS_STANDARD,
    totalStake: "0", //String(marketData["totalStake"]),
    winner: winningOutcomeId === -1 ? null : winningOutcomeId,
    hasWinner,
    reportingState,
    creatorFeeRaw: String(onChainFee),
    settlementFee: creatorFee,
    claimedProceeds: [],
    shareTokens,
    creator,
  };
};

const decodeMarketDetails = (market: MarketInfo, marketData: any) => {
  const {
    awayTeamId: coAwayTeamId,
    eventId: coEventId,
    homeTeamId: coHomeTeamId,
    estimatedStartTime,
    value0,
    marketType,
  } = marketData;
  // translate market data
  const eventIdValue = new BN(String(coEventId)).toString(16); // could be used to group events
  const eventId = `0${eventIdValue}`.slice(-32); // just grab the last 32
  const homeTeamId = String(coHomeTeamId); // home team identifier
  const awayTeamId = String(coAwayTeamId); // visiting team identifier
  const startTimestamp = new BN(String(estimatedStartTime)).toNumber(); // estiamted event start time
  let categories = getSportCategories(homeTeamId);
  if (!categories) categories = ["Unknown", "Unknown", "Unknown"];
  const line = new BN(String(value0)).div(10).decimalPlaces(0, 1).toNumber();
  const sportsMarketType = new BN(String(marketType)).toNumber(); // spread, todo: use constant when new sports market factory is ready.
  const homeTeam = getFullTeamName(homeTeamId);
  const awayTeam = getFullTeamName(awayTeamId);
  const sportId = getSportId(homeTeamId) || "4"; // TODO: need to add team so we get correct sportsId

  const { shareTokens } = market;
  const outcomes = decodeOutcomes(shareTokens, sportId, homeTeam, awayTeam, sportsMarketType, line);
  const { title, description } = getMarketTitle(sportId, homeTeam, awayTeam, sportsMarketType, line, startTimestamp);

  return {
    ...market,
    title,
    description,
    categories,
    outcomes,
    eventId,
    homeTeamId,
    awayTeamId,
    startTimestamp,
    sportId,
    sportsMarketType,
    spreadLine: line,
  };
};

const decodeOutcomes = (
  shareTokens: string[],
  sportId: string,
  homeTeam: string,
  awayTeam: string,
  sportsMarketType: number,
  line: string
) => {
  return shareTokens.map((shareToken, i) => {
    return {
      id: i,
      name: getOutcomeName(i, sportId, homeTeam, awayTeam, sportsMarketType, line), // todo: derive outcome name using market data
      symbol: shareToken,
      isInvalid: i === NO_CONTEST_OUTCOME_ID,
      isWinner: false, // need to get based on winning payout hash
      isFinalNumerator: false, // need to translate final numerator payout hash to outcome
      shareToken,
    };
  });
};

const toDisplayRatio = (onChainRatio: string = "0"): string => {
  // todo: need to use cash to get decimals
  return convertOnChainCashAmountToDisplayCashAmount(onChainRatio, 18).toFixed();
};

const toDisplayBalance = (onChainBalance: string = "0", numTick: string = "1000"): string => {
  // todo: need to use cash to get decimals
  const MULTIPLIER = new BN(10).pow(18);
  return new BN(onChainBalance).times(new BN(numTick)).div(MULTIPLIER).toFixed();
};

const toDisplayLiquidity = (onChainBalance: string = "0"): string => {
  return convertOnChainCashAmountToDisplayCashAmount(onChainBalance).toFixed();
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
