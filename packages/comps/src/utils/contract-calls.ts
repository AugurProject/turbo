// @ts-nocheck
import BigNumber, { BigNumber as BN } from "bignumber.js";
import { marketInvalidityCheck, getGasStation, NetworkId } from "@augurproject/sdk-lite";
import {
  TradingDirection,
  AmmExchange,
  AmmExchanges,
  AmmMarketShares,
  AmmTransaction,
  Cashes,
  CurrencyBalance,
  PositionBalance,
  TransactionTypes,
  UserBalances,
  MarketInfos,
  LPTokens,
  EstimateTradeResult,
  Cash,
  AddLiquidityBreakdown,
  LiquidityBreakdown,
  AmmOutcome,
} from "./types";
import { ethers } from "ethers";
import { Contract } from "@ethersproject/contracts";
import { Multicall, ContractCallResults, ContractCallContext } from "@augurproject/ethereum-multicall";
import { TransactionResponse, Web3Provider } from "@ethersproject/providers";
import {
  convertDisplayCashAmountToOnChainCashAmount,
  convertDisplayShareAmountToOnChainShareAmount,
  convertOnChainCashAmountToDisplayCashAmount,
  convertOnChainSharesToDisplayShareAmount,
  isSameAddress,
} from "./format-number";
import {
  ETH,
  NO_OUTCOME_ID,
  NULL_ADDRESS,
  USDC,
  YES_NO_OUTCOMES_NAMES,
  YES_OUTCOME_ID,
  INVALID_OUTCOME_ID,
  MARKET_STATUS,
  PORTION_OF_INVALID_POOL_SELL,
} from "./constants";
import { getProviderOrSigner } from "../components/ConnectAccount/utils";
import { createBigNumber } from "./create-big-number";
import { PARA_CONFIG } from "../stores/constants";
import ERC20ABI from "./ERC20ABI.json";
import BPoolABI from "./BPoolABI.json";
import ParaShareTokenABI from "./ParaShareTokenABI.json";
import TurboHatcheryABI from "@augurproject/smart/abi/contracts/turbo/TurboHatchery.sol/TurboHatchery.json";
import TrustedArbiterABI from "@augurproject/smart/abi/contracts/turbo/TrustedArbiter.sol/TrustedArbiter.json";
import AmmFactoryABI from "@augurproject/smart/abi/contracts/turbo/AMMFactory.sol/AMMFactory.json";

const isValidPrice = (price: string): boolean => {
  return price !== null && price !== undefined && price !== "0" && price !== "0.00";
};

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
  if (!account || !marketId || !amount || !outcomes || outcomes.length === 0 || !cash) return null;
  const priceNo = outcomes[NO_OUTCOME_ID]?.price;
  const priceYes = outcomes[YES_OUTCOME_ID]?.price;
  if (!isValidPrice(priceNo) || !isValidPrice(priceYes)) return null;
  if (amount === "0" || amount === "0.00") return null;
  if (Number(fee) < 0) return null;

  return {
    account,
    amm,
    marketId,
    cash,
    fee,
    amount,
    priceNo,
    priceYes,
  };
};

export async function estimateLiquidityPool(
  account: string,
  provider: Web3Provider,
  amm: AmmExchange,
  cash: Cash,
  fee: string,
  cashAmount: string,
  priceNo: string,
  priceYes: string
): Promise<AddLiquidityBreakdown> | Promise<TransactionResponse> {
  if (!provider) console.error("provider is null");
  const ammFactoryContract = getAmmFactoryContract(provider, account);
  const { weights, amount, hatcheryAddress, turboId } = shapeAddLiquidityPool(amm, cash, cashAmount, priceNo, priceYes);
  const ammAddress = amm?.id;

  let addLiquidityResults = null;
  if (!ammAddress) {
    addLiquidityResults = await ammFactoryContract.callStatic.createPool(
      hatcheryAddress,
      turboId,
      amount,
      weights,
      account
    );
  } else {
    // todo: get what the min lp token out is
    addLiquidityResults = await ammFactoryContract.callStatic.addLiquidity(
      hatcheryAddress,
      turboId,
      amount,
      0,
      account
    );
  }

  console.log("addLiquidityResults", addLiquidityResults);

  if (addLiquidityResults) {
    // lp tokens are 18 decimal
    const lpTokens = trimDecimalValue(convertOnChainSharesToDisplayShareAmount(String(addLiquidityResults), 18));
    // adding liquidity doesn't return any shares at this time.
    const noShares = trimDecimalValue(convertOnChainSharesToDisplayShareAmount(String("0"), cash.decimals));
    const yesShares = trimDecimalValue(convertOnChainSharesToDisplayShareAmount(String("0"), cash.decimals));

    return {
      lpTokens,
      yesShares,
      noShares,
    };
  }

  return null;
}

export async function addLiquidityPool(
  account: string,
  provider: Web3Provider,
  amm: AmmExchange,
  cash: Cash,
  fee: string,
  cashAmount: string,
  priceNo: string,
  priceYes: string
): Promise<AddLiquidityBreakdown> | Promise<TransactionResponse> {
  if (!provider) console.error("provider is null");
  const ammFactoryContract = getAmmFactoryContract(provider, account);
  const { weights, amount, hatcheryAddress, turboId } = shapeAddLiquidityPool(amm, cash, cashAmount, priceNo, priceYes);
  const ammAddress = amm?.id;
  let tx = null;
  if (!ammAddress) {
    tx = ammFactoryContract.createPool(hatcheryAddress, turboId, amount, weights, account);
  } else {
    // todo: get what the min lp token out is
    tx = ammFactoryContract.addLiquidity(hatcheryAddress, turboId, amount, 0, account);
  }

  return tx;
}

function shapeAddLiquidityPool(
  amm: AmmExchange,
  cash: Cash,
  cashAmount: string,
  priceNo: string,
  priceYes: string
): {} {
  const ammAddress = amm?.id;
  const { hatcheryAddress, turboId } = amm;
  const amount = convertDisplayCashAmountToOnChainCashAmount(cashAmount, cash.decimals).toFixed();

  let weights = [];
  if (!ammAddress) {
    const decimalPercentNoContest = 0.02;
    const totalWeight = 50; // just how balancer weights work, total weight is 50
    const multiplier = new BN(10).pow(new BN(18));
    // convert price to percentage of weight in the balancer pool.
    // each outcome gets a
    const yesWeight = String(new BN(priceNo).minus(0.01).times(totalWeight).times(multiplier));
    const noWeight = String(new BN(priceYes).minus(0.01).times(totalWeight).times(multiplier));
    const noContestWeight = String(new BN(decimalPercentNoContest).times(totalWeight).times(multiplier));

    weights = [noContestWeight, noWeight, yesWeight];
  }
  return {
    hatcheryAddress,
    turboId,
    weights,
    amount,
  };
}

export async function getRemoveLiquidity(
  marketId: string,
  provider: Web3Provider,
  cash: Cash,
  fee: string,
  lpTokenBalance: string
): Promise<LiquidityBreakdown | null> {
  if (!provider) {
    console.error("getRemoveLiquidity: no provider");
    return null;
  }
  const ammFactoryContract = getAmmFactoryContract(provider, account);
  const balance = convertDisplayShareAmountToOnChainShareAmount(lpTokenBalance, cash?.decimals);

  const results = await ammFactoryContract.callStatic
    .removeLiquidity(marketId, cash.shareToken, new BN(String(fee)), new BN(String(balance)))
    .catch((e) => console.log(e));

  if (!results) return null;

  const shortShares = String(convertOnChainSharesToDisplayShareAmount(results.short, cash?.decimals));
  const longShares = String(convertOnChainSharesToDisplayShareAmount(results.long, cash?.decimals));

  return {
    noShares: shortShares,
    yesShares: longShares,
  };
}

export function doRemoveLiquidity(
  amm: AmmExchange,
  provider: Web3Provider,
  amount: string
): Promise<TransactionResponse | null> {
  if (!provider) {
    console.error("doRemoveLiquidity: no provider");
    return null;
  }
  const ammFactoryContract = getAmmFactoryContract(provider, account);
  const balance = convertDisplayShareAmountToOnChainShareAmount(amount, cash?.decimals);
  console.log(
    "doRemoveLiquidity",
    "marketId",
    marketId,
    "shareToken",
    cash.shareToken,
    "fee",
    fee,
    "balance",
    String(balance),
    "symbols",
    symbols
  );
  return ammFactoryContract.removeLiquidity(marketId, cash.shareToken, new BN(fee), balance, symbols);
}

export const estimateBuyTrade = async (
  amm: AmmExchange,
  provider: Web3Provider,
  inputDisplayAmount: string,
  selectedOutcomeId: number,
  account: string,
  cash: Cash
): Promise<EstimateTradeResult | null> => {
  if (!provider) {
    console.error("doRemoveLiquidity: no provider");
    return null;
  }
  const ammFactoryContract = getAmmFactoryContract(provider, account);
  const { hatcheryAddress, turboId } = amm;

  const amount = convertDisplayCashAmountToOnChainCashAmount(inputDisplayAmount, cash.decimals).toFixed();
  const result = await ammFactoryContract.callStatic.buy(hatcheryAddress, turboId, selectedOutcomeId, amount, 0);
  const estimatedShares = convertOnChainSharesToDisplayShareAmount(String(result), 18);

  const tradeFees = String(estimatedShares.times(new BN(amm.feeDecimal)));

  const averagePrice = new BN(inputDisplayAmount).div(new BN(estimatedShares)).toFixed(4);
  const maxProfit = String(new BN(estimatedShares).minus(new BN(inputDisplayAmount)));
  const price = new BN(amm.ammOutcomes[selectedOutcomeId]?.price);
  const slippagePercent = new BN(averagePrice).minus(price).div(price).times(100).toFixed(4);
  const ratePerCash = new BN(estimatedShares).div(new BN(inputDisplayAmount)).toFixed(6);

  return {
    outputValue: trimDecimalValue(estimatedShares),
    tradeFees,
    averagePrice,
    maxProfit,
    slippagePercent,
    ratePerCash,
  };
};

export const estimateSellTrade = async (
  amm: AmmExchange,
  provider: Web3Provider,
  inputDisplayAmount: string,
  selectedOutcomeId: number,
  userBalances: string[],
  account: string,
  cash: Cash
): Promise<EstimateTradeResult | null> => {
  if (!provider) {
    console.error("estimateSellTrade: no provider");
    return null;
  }
  const ammFactoryContract = getAmmFactoryContract(provider, account);
  let longShares = new BN("0");
  let shortShares = new BN("0");
  let invalidShares = new BN(userBalances[0]);
  if (!selectedOutcomeId) {
    let shortOnChainShares = convertDisplayShareAmountToOnChainShareAmount(
      new BN(inputDisplayAmount),
      new BN(amm?.cash?.decimals)
    );
    shortShares = BN.minimum(invalidShares, shortOnChainShares);
  } else {
    longShares = convertDisplayShareAmountToOnChainShareAmount(new BN(inputDisplayAmount), new BN(cash?.decimals));
  }

  const liqNo = convertDisplayShareAmountToOnChainShareAmount(
    new BN(amm?.liquidityNo || "0"),
    new BN(amm?.cash?.decimals)
  );
  const liqYes = convertDisplayShareAmountToOnChainShareAmount(
    new BN(amm?.liquidityYes || "0"),
    new BN(amm?.cash?.decimals)
  );

  // TODO get these from the graph or node. these values will be wrong most of the time
  const marketCreatorFeeDivisor = new BN(100);
  const reportingFee = new BN(10000);
  const breakdownWithFeeRaw = await ammFactoryContract.callStatic
    .sell(
      new BN(amm?.totalSupply || "0"),
      liqNo,
      liqYes,
      new BN(amm?.feeRaw),
      shortShares,
      longShares,
      true,
      marketCreatorFeeDivisor,
      reportingFee
    )
    .catch((e) => console.log(e));

  if (!breakdownWithFeeRaw) return null;

  const estimateCash = convertOnChainCashAmountToDisplayCashAmount(breakdownWithFeeRaw, amm.cash.decimals);
  const tradeFees = String(estimateCash.times(new BN(amm.feeDecimal)));

  const averagePrice = new BN(estimateCash).div(new BN(inputDisplayAmount)).toFixed(2);
  const price = amm.ammOutcomes[selectedOutcomeId].price;
  const shares = !selectedOutcomeId
    ? new BN(userBalances[selectedOutcomeId] || "0")
    : BigNumber.min(new BN(userBalances[0]), new BN(userBalances[selectedOutcomeId]));
  const slippagePercent = new BN(averagePrice).minus(price).div(price).times(100).toFixed(2);
  const ratePerCash = new BN(estimateCash).div(new BN(inputDisplayAmount)).toFixed(6);
  const displayShares = convertOnChainSharesToDisplayShareAmount(shares, amm.cash.decimals);
  let remainingShares = new BN(displayShares || "0").minus(new BN(inputDisplayAmount));

  if (remainingShares.lt(new BN(0))) {
    remainingShares = new BN(0);
  }

  return {
    outputValue: String(estimateCash),
    tradeFees,
    averagePrice,
    maxProfit: null,
    slippagePercent,
    ratePerCash,
    remainingShares: remainingShares.toFixed(6),
  };
};

export async function doTrade(
  tradeDirection: TradingDirection,
  provider: Web3Provider,
  amm: AmmExchange,
  minAmount: string,
  inputDisplayAmount: string,
  selectedOutcomeId: number,
  userBalances: string[] = ["0", "0", "0"],
  account: string,
  cash: Cash
) {
  if (!provider) return console.error("doTrade: no provider");
  const ammFactoryContract = getAmmFactoryContract(provider, account);
  const { hatcheryAddress, turboId } = amm;
  if (tradeDirection === TradingDirection.ENTRY) {
    const bareMinAmount = new BN(minAmount).lt(0) ? 0 : minAmount;
    const onChainMinShares = convertDisplayShareAmountToOnChainShareAmount(bareMinAmount, cash.decimals)
      .decimalPlaces(0)
      .toFixed();
    const amount = convertDisplayCashAmountToOnChainCashAmount(inputDisplayAmount, cash.decimals).toFixed();
    return ammFactoryContract.buy(hatcheryAddress, turboId, selectedOutcomeId, amount, onChainMinShares);
  }

  if (tradeDirection === TradingDirection.EXIT) {
    const inputOnChainSharesAmount = convertDisplayShareAmountToOnChainShareAmount(
      new BN(inputDisplayAmount || "0"),
      new BN(cash.decimals)
    );
    let longShares = new BN("0");
    let shortShares = new BN("0");
    let invalidShares = new BN(userBalances[0]);
    if (!outputYesShares) {
      shortShares = new BN(inputOnChainSharesAmount);
      shortShares = BN.minimum(invalidShares, shortShares);
    } else {
      longShares = new BN(inputOnChainSharesAmount);
    }
    let onChainMinAmount = convertDisplayCashAmountToOnChainCashAmount(
      new BN(minAmount),
      new BN(cash.decimals)
    ).decimalPlaces(0);

    if (onChainMinAmount.lt(0)) {
      onChainMinAmount = new BN(0);
    }

    console.log(
      "doExitPosition:",
      cash.shareToken,
      "invalidShares",
      String(invalidShares),
      "short",
      String(shortShares),
      "long",
      String(longShares),
      "min amount",
      String(onChainMinAmount)
    );

    return ammFactoryContract.sell(
      amm.marketId,
      cash.shareToken,
      new BN(amm.feeRaw),
      shortShares,
      longShares,
      onChainMinAmount
    );
  }

  return null;
}

export const claimWinnings = (
  account: string,
  provider: Web3Provider,
  marketIds: string[],
  cash: Cash
): Promise<TransactionResponse | null> => {
  if (!provider) return console.error("doTrade: no provider");
  const hatcheryContract = getHatcheryContract(provider, account);
  const shareTokens = marketIds.map((m) => cash?.shareToken);
  return hatcheryContract.claimWinnings(marketIds, shareTokens, account, ethers.utils.formatBytes32String("11"));
};

interface UserTrades {
  enters: AmmTransaction[];
  exits: AmmTransaction[];
}

export const getUserBalances = async (
  provider: Web3Provider,
  account: string,
  ammExchanges: AmmExchanges,
  cashes: Cashes,
  markets: MarketInfos
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
  };

  if (!account || !provider) return userBalances;

  const BALANCE_OF = "balanceOf";
  const LP_TOKEN_COLLECTION = "lpTokens";
  const MARKET_SHARE_COLLECTION = "marketShares";
  // finalized markets
  const finalizedMarkets = Object.values(markets).filter((m) => m.reportingState === MARKET_STATUS.FINALIZED);
  const finalizedMarketIds = finalizedMarkets.map((f) => f.marketId);
  const finalizedAmmExchanges = Object.values(ammExchanges).filter((a) => finalizedMarketIds.includes(a.marketId));

  // balance of
  const exchanges = Object.values(ammExchanges).filter((e) => e.id);
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
        },
      },
    ],
  }));

  const contractMarketShareBalanceCall: ContractCallContext[] = exchanges.reduce((p, exchange) => {
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
            decimals: 18,
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
    const { dataKey, collection, decimals, marketId, outcomeId } = context;
    const balance = convertOnChainCashAmountToDisplayCashAmount(new BN(rawBalance), new BN(decimals));

    if (method === BALANCE_OF) {
      if (!collection) {
        userBalances[dataKey] = {
          balance: balance.toFixed(),
          rawBalance: rawBalance,
          usdValue: balance.toFixed(),
        };
      } else if (collection === LP_TOKEN_COLLECTION) {
        userBalances[collection][dataKey] = { balance: String(balance), rawBalance, marketId };
      } else if (collection === MARKET_SHARE_COLLECTION) {
        // todo: re organize balances to be really simple (future)
        // can index using dataKey (shareToken)
        //userBalances[collection][dataKey] = { balance: String(balance), rawBalance, marketId };

        // shape AmmMarketShares
        const existingMarketShares = userBalances.marketShares[marketId];
        if (existingMarketShares) {
          userBalances.marketShares[marketId].outcomeSharesRaw[outcomeId] = rawBalance;
          userBalances.marketShares[marketId].outcomeShares[outcomeId] = balance.toFixed();
        } else if (balance.toFixed() !== "0") {
          const exchange = ammExchanges[marketId];
          userBalances.marketShares[marketId] = {
            ammExchange: exchange,
            positions: [],
            outcomeSharesRaw: ["0", "0", "0"], // this needs to be dynamic
            outcomeShares: ["0", "0", "0"], // this needs to be dynamic
          };
          // calc user position here **
          userBalances.marketShares[marketId].outcomeSharesRaw[outcomeId] = rawBalance;
          userBalances.marketShares[marketId].outcomeShares[outcomeId] = balance.toFixed();
        }
      }
    }
  }

  if (finalizedMarkets.length > 0) {
    const keyedFinalizedMarkets = finalizedMarkets.reduce((p, f) => ({ ...p, [f.marketId]: f }), {});
    populateClaimableWinnings(keyedFinalizedMarkets, finalizedAmmExchanges, userBalances.marketShares);
  }

  normalizeNoInvalidPositionsBalances(userBalances.marketShares, ammExchanges);
  const userPositions = getTotalPositions(userBalances.marketShares);
  const availableFundsUsd = String(new BN(userBalances.ETH.usdValue).plus(new BN(userBalances.USDC.usdValue)));
  const totalAccountValue = String(new BN(availableFundsUsd).plus(new BN(userPositions.totalPositionUsd)));
  await populateInitLPValues(userBalances.lpTokens, ammExchanges, account);

  return { ...userBalances, ...userPositions, totalAccountValue, availableFundsUsd };
};

export const getMarketInvalidity = async (
  provider: Web3Provider,
  markets: MarketInfos,
  ammExchanges: AmmExchanges,
  cashes: Cashes
): Promise<{ markets: MarketInfos; ammExchanges: AmmExchanges }> => {
  if (!provider) return { markets, ammExchanges };

  const CALC_OUT_GIVEN_IN = "calcOutGivenIn";
  const exchanges = Object.values(ammExchanges);
  const invalidMarkets: string[] = [];

  const multicall = new Multicall({ ethersProvider: provider });
  const contractLpBalanceCall: ContractCallContext[] = exchanges
    .filter((e) => e?.invalidPool?.id && e?.invalidPool?.invalidBalance && e.invalidPool?.invalidBalance !== "0")
    .reduce(
      (p, exchange) => [
        ...p,
        {
          reference: `${exchange?.id}-bPool`,
          contractAddress: exchange?.invalidPool?.id,
          abi: BPoolABI,
          calls: [
            {
              reference: `${exchange?.id}-bPool`,
              methodName: CALC_OUT_GIVEN_IN,
              methodParameters: [
                exchange?.invalidPool?.invalidBalance,
                exchange?.invalidPool?.invalidWeight,
                exchange?.invalidPool?.cashBalance,
                exchange?.invalidPool?.cashWeight,
                PORTION_OF_INVALID_POOL_SELL.times(new BN(exchange?.invalidPool?.invalidBalance)).toFixed(0),
                exchange?.invalidPool?.swapFee || "0",
              ],
              context: {
                ammExchangeId: exchange?.id,
              },
            },
          ],
        },
      ],
      []
    );

  const balanceResult: ContractCallResults = await multicall.call(contractLpBalanceCall);

  for (let i = 0; i < Object.keys(balanceResult.results).length; i++) {
    const key = Object.keys(balanceResult.results)[i];
    const method = String(balanceResult.results[key].originalContractCallContext.calls[0].methodName);
    const balanceValue = balanceResult.results[key].callsReturnContext[0].returnValues as ethers.utils.Result;
    const context = balanceResult.results[key].originalContractCallContext.calls[0].context;
    const rawBalance = new BN(balanceValue.hex).toFixed();

    if (method === CALC_OUT_GIVEN_IN) {
      const amm = ammExchanges[context.ammExchangeId];
      const outputCash = convertOnChainCashAmountToDisplayCashAmount(new BN(rawBalance), amm?.cash?.decimals);
      amm.swapInvalidForCashInETH = outputCash.toFixed();
      if (amm.cash.name !== ETH) {
        // converting raw value in cash to cash in ETH. needed for invalidity check
        const ethCash = Object.values(cashes).find((c) => c.name === ETH);
        amm.swapInvalidForCashInETH = outputCash.div(new BN(ethCash.usdPrice)).toFixed();
      }
      amm.isAmmMarketInvalid = await getIsMarketInvalid(amm, cashes);
      if (amm.isAmmMarketInvalid) {
        invalidMarkets.push(amm.marketId);
      }
    }
  }

  // reset all invalid flags
  Object.values(markets).forEach((m) => {
    const isInvalid = invalidMarkets.includes(m.marketId);
    if (m.isInvalid !== isInvalid) m.isInvalid = isInvalid;
  });

  return { markets, ammExchanges };
};

const populateClaimableWinnings = (
  finalizedMarkets: MarketInfos = {},
  finalizedAmmExchanges: AmmExchange[] = [],
  marketShares: AmmMarketShares = {}
): void => {
  finalizedAmmExchanges.reduce((p, amm) => {
    const market = finalizedMarkets[amm.marketId];
    const winningOutcome = market.outcomes.find((o) => o.payoutNumerator !== "0");
    if (winningOutcome) {
      const outcomeBalances = marketShares[amm.id];
      const userShares = outcomeBalances?.positions.find((p) => p.outcomeId === winningOutcome.id);
      if (userShares && new BN(userShares?.rawBalance).gt(0)) {
        const initValue = userShares.initCostCash; // get init CostCash
        const claimableBalance = new BN(userShares.balance).minus(new BN(initValue)).abs().toFixed(4);
        marketShares[amm.id].claimableWinnings = {
          claimableBalance,
          sharetoken: amm.cash.shareToken,
          userBalances: outcomeBalances.outcomeSharesRaw,
        };
      }
    }
    return p;
  }, {});
};

const normalizeNoInvalidPositionsBalances = (ammMarketShares: AmmMarketShares, ammExchanges: AmmExchanges): void => {
  Object.keys(ammMarketShares).forEach((ammId) => {
    const marketShares = ammMarketShares[ammId];
    const amm = ammExchanges[ammId];
    const minNoInvalidBalance = String(
      Math.min(Number(marketShares.outcomeShares[0]), Number(marketShares.outcomeShares[1]))
    );
    marketShares.outcomeShares[1] = minNoInvalidBalance;
    const minNoInvalidRawBalance = String(
      BigNumber.min(new BN(marketShares.outcomeSharesRaw[0]), new BN(marketShares.outcomeSharesRaw[1]))
    );
    const newPositions = marketShares.positions.reduce((p, position) => {
      // user can only sell the min of 'No' and 'Invalid' shares
      if (position.outcomeId === NO_OUTCOME_ID && minNoInvalidBalance === "0") return p;
      if (position.outcomeId === NO_OUTCOME_ID) {
        const { priceNo, past24hrPriceNo } = amm;
        position.balance = minNoInvalidBalance;
        position.rawBalance = minNoInvalidRawBalance;
        position.quantity = trimDecimalValue(minNoInvalidBalance);
        position.usdValue = String(new BN(minNoInvalidBalance).times(new BN(priceNo)).times(amm.cash.usdPrice));
        position.past24hrUsdValue = past24hrPriceNo
          ? String(new BN(minNoInvalidBalance).times(new BN(past24hrPriceNo)))
          : null;
      }
      return [...p, position];
    }, []);
    marketShares.positions = newPositions;
  });
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
  trades: UserTrades,
  rawBalance: string,
  balance: string,
  outcome: string,
  amm: AmmExchange,
  account: string
): PositionBalance => {
  const { priceNo, priceYes, past24hrPriceNo, past24hrPriceYes } = amm;
  let currUsdValue = "0";
  let past24hrUsdValue = null;
  let change24hrPositionUsd = null;
  let avgPrice = "0";
  let initCostUsd = "0";
  let initCostCash = "0";
  let totalChangeUsd = "0";
  let quantity = trimDecimalValue(balance);
  const outcomeId = Number(outcome);
  let visible = false;
  let positionFromLiquidity = false;
  let positionFromRemoveLiquidity = false;
  // need to get this from outcome
  const outcomeName = YES_NO_OUTCOMES_NAMES[Number(outcome)];
  const maxUsdValue = String(new BN(balance).times(new BN(amm.cash.usdPrice)));
  if (balance !== "0" && outcome !== String(INVALID_OUTCOME_ID)) {
    let result = null;
    if (outcome === String(NO_OUTCOME_ID)) {
      currUsdValue = String(new BN(balance).times(new BN(priceNo)).times(new BN(amm.cash.usdPrice)));
      past24hrUsdValue = past24hrPriceNo ? String(new BN(balance).times(new BN(past24hrPriceNo))) : null;
      change24hrPositionUsd = past24hrPriceNo ? String(new BN(currUsdValue).times(new BN(past24hrUsdValue))) : null;
      result = getInitPositionValues(trades, amm, false, account);
    } else if (outcome === String(YES_OUTCOME_ID)) {
      currUsdValue = String(new BN(balance).times(new BN(priceYes)).times(new BN(amm.cash.usdPrice)));
      past24hrUsdValue = past24hrPriceYes ? String(new BN(balance).times(new BN(past24hrPriceYes))) : null;
      change24hrPositionUsd = past24hrPriceYes ? String(new BN(currUsdValue).times(new BN(past24hrUsdValue))) : null;
      result = getInitPositionValues(trades, amm, true, account);
    }
    avgPrice = trimDecimalValue(result.avgPrice);
    initCostUsd = new BN(result.avgPrice).times(new BN(quantity)).toFixed(4);
    initCostCash = result.initCostCash;
    let usdChangedValue = new BN(currUsdValue).minus(new BN(initCostUsd));
    // ignore negative dust difference
    if (usdChangedValue.lt(new BN("0")) && usdChangedValue.gt(new BN("-0.001"))) {
      usdChangedValue = usdChangedValue.abs();
    }
    totalChangeUsd = trimDecimalValue(usdChangedValue);
    visible = true;
    positionFromLiquidity = !result.positionFromRemoveLiquidity && result.positionFromLiquidity;
    positionFromRemoveLiquidity = result.positionFromRemoveLiquidity;
  }

  if (new BN(avgPrice).eq(0) || new BN(balance).eq(0)) return null;

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
    initCostCash,
    outcomeName,
    outcomeId,
    maxUsdValue,
    visible,
    positionFromLiquidity,
    positionFromRemoveLiquidity,
  };
};

export const getLPCurrentValue = async (displayBalance: string, amm: AmmExchange): Promise<string> => {
  const usdPrice = amm.cash?.usdPrice ? amm.cash?.usdPrice : "0";
  const { marketId, cash, feeRaw, priceNo, priceYes } = amm;
  // todo: need a way to determine value of LP tokens
  const estimate = null; //await getRemoveLiquidity(marketId, null, cash, feeRaw, displayBalance).catch((error) =>
  //console.error("estimation error", error)
  //);
  if (estimate) {
    const displayNoValue = new BN(estimate.noShares).times(new BN(priceNo)).times(usdPrice);
    const displayYesValue = new BN(estimate.yesShares).times(new BN(priceYes)).times(usdPrice);
    const totalValue = displayNoValue.plus(displayYesValue);
    return String(totalValue);
  }
  return null;
};

const populateInitLPValues = async (
  lptokens: LPTokens,
  ammExchanges: AmmExchanges,
  account: string
): Promise<LPTokens> => {
  const ammIds = Object.keys(lptokens);
  for (let i = 0; i < ammIds.length; i++) {
    const ammId = ammIds[i];
    const lptoken = lptokens[ammId];
    const amm = ammExchanges[ammId];
    // sum up enters/exits transaction usd cash values
    const initialCashValueUsd = accumLpSharesAmounts(amm.transactions, account);
    lptoken.initCostUsd = initialCashValueUsd;
    // call `getLPCurrentValue` from Viz
    lptoken.usdValue = "0"; //await getLPCurrentValue(lptoken.balance, amm);
  }

  return lptokens;
};

const accumLpSharesAmounts = (transactions: AmmTransaction[], account: string): string => {
  const adds = transactions
    .filter((t) => isSameAddress(t.sender, account) && t.tx_type === TransactionTypes.ADD_LIQUIDITY)
    .reduce((p, t) => p.plus(new BN(t.cashValueUsd || "0")), new BN("0"));
  const removed = transactions
    .filter((t) => isSameAddress(t.sender, account) && t.tx_type === TransactionTypes.REMOVE_LIQUIDITY)
    .reduce((p, t) => p.plus(new BN(t.cashValueUsd || "0")), new BN("0"));

  return String(adds.minus(removed));
};

// TODO: isYesOutcome is for convenience, down the road, outcome index will be used.
const getInitPositionValues = (
  trades: UserTrades,
  amm: AmmExchange,
  isYesOutcome: boolean,
  account: string
): { avgPrice: string; initCostCash: string; positionFromLiquidity: boolean; positionFromRemoveLiquidity: boolean } => {
  // sum up trades shares
  const claimTimestamp = lastClaimTimestamp(amm, isYesOutcome, account);
  const sharesEntered = accumSharesPrice(trades.enters, isYesOutcome, account, claimTimestamp);
  const sharesExited = accumSharesPrice(trades.exits, isYesOutcome, account, claimTimestamp);

  const enterAvgPriceBN = sharesEntered.shares.gt(0) ? sharesEntered.cashAmount.div(sharesEntered.shares) : new BN(0);

  // get shares from LP activity
  const sharesAddLiquidity = accumLpSharesAddPrice(amm.transactions, isYesOutcome, account, claimTimestamp);
  const sharesRemoveLiquidity = accumLpSharesRemovesPrice(amm.transactions, isYesOutcome, account, claimTimestamp);

  const positionFromLiquidity = sharesAddLiquidity.shares.gt(new BN(0));
  const positionFromRemoveLiquidity = sharesRemoveLiquidity.shares.gt(new BN(0));

  // liquidity has cash and cash for shares properties
  const allInputCashAmounts = sharesRemoveLiquidity.cashAmount
    .plus(sharesAddLiquidity.cashAmount)
    .plus(sharesEntered.cashAmount);
  const netCashAmounts = allInputCashAmounts.minus(sharesExited.cashAmount);
  const initCostCash = convertOnChainSharesToDisplayShareAmount(netCashAmounts, amm.cash.decimals);

  const totalLiquidityShares = sharesRemoveLiquidity.shares.plus(sharesAddLiquidity.shares);
  const allCashShareAmounts = sharesRemoveLiquidity.cashAmount.plus(sharesAddLiquidity.cashAmount);

  const avgPriceLiquidity = totalLiquidityShares.gt(0) ? allCashShareAmounts.div(totalLiquidityShares) : new BN(0);

  const totalShares = totalLiquidityShares.plus(sharesEntered.shares);
  const weightedAvgPrice = totalShares.gt(new BN(0))
    ? avgPriceLiquidity
        .times(totalLiquidityShares)
        .div(totalShares)
        .plus(enterAvgPriceBN.times(sharesEntered.shares).div(totalShares))
    : 0;

  return {
    avgPrice: String(weightedAvgPrice),
    initCostCash: initCostCash.toFixed(4),
    positionFromLiquidity,
    positionFromRemoveLiquidity,
  };
};

const accumSharesPrice = (
  trades: AmmTransaction[],
  isYesOutcome: boolean,
  account: string,
  cutOffTimestamp: number
): { shares: BigNumber; cashAmount: BigNumber } => {
  const result = trades
    .filter(
      (t) =>
        isSameAddress(t.sender, account) &&
        (isYesOutcome ? t.yesShares !== "0" : t.noShares !== "0") &&
        Number(t.timestamp) > cutOffTimestamp
    )
    .reduce(
      (p, t) =>
        isYesOutcome
          ? {
              shares: p.shares.plus(new BN(t.yesShares)),
              cashAmount: p.cashAmount.plus(new BN(t.yesShares).times(t.price)),
            }
          : {
              shares: p.shares.plus(new BN(t.noShares)),
              cashAmount: p.cashAmount.plus(new BN(t.noShares).times(t.price)),
            },
      { shares: new BN(0), cashAmount: new BN(0) }
    );

  return { shares: result.shares, cashAmount: result.cashAmount };
};

const accumLpSharesAddPrice = (
  transactions: AmmTransaction[],
  isYesOutcome: boolean,
  account: string,
  cutOffTimestamp: number
): { shares: BigNumber; cashAmount: BigNumber } => {
  const result = transactions
    .filter(
      (t) =>
        isSameAddress(t.sender, account) &&
        t.tx_type === TransactionTypes.ADD_LIQUIDITY &&
        Number(t.timestamp) > cutOffTimestamp
    )
    .reduce(
      (p, t) => {
        const yesShares = new BN(t.yesShares);
        const noShares = new BN(t.noShares);
        const cashValue = new BN(t.cash).minus(new BN(t.cashValue));

        if (isYesOutcome) {
          const netYesShares = noShares.minus(yesShares);
          if (netYesShares.lte(new BN(0))) return p;
          return { shares: p.shares.plus(t.netShares), cashAmount: p.cashAmount.plus(new BN(cashValue)) };
        }
        const netNoShares = yesShares.minus(noShares);
        if (netNoShares.lte(new BN(0))) return p;
        return { shares: p.shares.plus(t.netShares), cashAmount: p.cashAmount.plus(new BN(cashValue)) };
      },
      { shares: new BN(0), cashAmount: new BN(0) }
    );

  return { shares: result.shares, cashAmount: result.cashAmount };
};

const accumLpSharesRemovesPrice = (
  transactions: AmmTransaction[],
  isYesOutcome: boolean,
  account: string,
  cutOffTimestamp: number
): { shares: BigNumber; cashAmount: BigNumber } => {
  const result = transactions
    .filter(
      (t) =>
        isSameAddress(t.sender, account) &&
        t.tx_type === TransactionTypes.REMOVE_LIQUIDITY &&
        Number(t.timestamp) > cutOffTimestamp
    )
    .reduce(
      (p, t) => {
        const yesShares = new BN(t.yesShares);
        const noShares = new BN(t.noShares);

        if (isYesOutcome) {
          const cashValue = new BN(t.noShareCashValue);
          return { shares: p.shares.plus(yesShares), cashAmount: p.cashAmount.plus(new BN(cashValue)) };
        }
        const cashValue = new BN(t.yesShareCashValue);
        return { shares: p.shares.plus(noShares), cashAmount: p.cashAmount.plus(new BN(cashValue)) };
      },
      { shares: new BN(0), cashAmount: new BN(0) }
    );

  return { shares: result.shares, cashAmount: result.cashAmount };
};

const lastClaimTimestamp = (amm: AmmExchange, isYesOutcome: boolean, account: string): number => {
  const shareToken = amm.cash.shareToken;
  const claims = amm.market.claimedProceeds.filter(
    (c) =>
      isSameAddress(c.shareToken, shareToken) &&
      isSameAddress(c.user, account) &&
      c.outcome === (isYesOutcome ? YES_OUTCOME_ID : NO_OUTCOME_ID)
  );
  return claims.reduce((p, c) => (Number(c.timestamp) > p ? Number(c.timestamp) : p), 0);
};

const getIsMarketInvalid = async (amm: AmmExchange, cashes: Cashes): Promise<boolean> => {
  const gasLevels = await getGasStation(PARA_CONFIG.networkId as NetworkId);
  const { invalidPool, market, swapInvalidForCashInETH } = amm;
  const { invalidBalance } = invalidPool;

  const reportingFeeDivisor = Number(market.reportingFee);
  const marketProperties = {
    endTime: Number(market.endTimestamp),
    numTicks: Number(market.numTicks),
    feeDivisor: Number(market.fee),
  };

  // TODO: there might be more coversion needed because of how wrapped shares works with balancer pool
  // numTicks might play a roll here
  // invalid shares are Mega Shares, need to div by num ticks.
  let sharesSold = convertOnChainCashAmountToDisplayCashAmount(
    new BN(invalidBalance).times(PORTION_OF_INVALID_POOL_SELL),
    18
  );
  if (amm?.cash?.name !== ETH) {
    // converting shares value based in non-ETH to shares based on ETH.
    const ethCash = Object.values(cashes).find((c) => c.name === ETH);
    sharesSold = sharesSold.div(new BN(ethCash.usdPrice));
  }

  const isInvalid = marketInvalidityCheck.isMarketInvalid(
    new BN(swapInvalidForCashInETH),
    sharesSold,
    marketProperties,
    reportingFeeDivisor,
    gasLevels
  );

  return isInvalid;
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

const getUserTrades = (
  account: string,
  transactions: AmmTransaction[]
): { enters: AmmTransaction[]; exits: AmmTransaction[] } => {
  if (!transactions || transactions.length === 0) return { enters: [], exits: [] };
  const enterTrades = transactions.filter(
    (t) => t.sender.toLowerCase() === account.toLowerCase() && t.tx_type === TransactionTypes.ENTER
  );
  const exitTrades = transactions.filter(
    (t) => t.sender.toLowerCase() === account.toLowerCase() && t.tx_type === TransactionTypes.EXIT
  );
  return { enters: enterTrades, exits: exitTrades };
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

const getAmmFactoryContract = (library: Web3Provider, account?: string): Contract => {
  const { ammFactory } = PARA_CONFIG;
  return getContract(ammFactory, AmmFactoryABI, library, account);
};

const getHatcheryContract = (library: Web3Provider, account?: string): Contract => {
  const { hatchery } = PARA_CONFIG;
  return getContract(hatchery, TurboHatcheryABI, library, account);
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

export const getMarketInfos = async (
  provider: Web3Provider,
  markets: MarketInfos,
  cashes: Cashes,
  account: string
): { markets: MarketInfos; ammExchanges: AmmExchanges; blocknumber: number } => {
  const { hatchery, arbiter, ammFactory } = PARA_CONFIG;
  const hatcheryContract = getContract(hatchery, TurboHatcheryABI, provider, account);
  const numMarkets = (await hatcheryContract.getTurboLength()).toNumber();

  let indexes = [];
  for (let i = 0; i < numMarkets; i++) {
    indexes.push(i);
  }

  const { marketInfos, exchanges, blocknumber } = await retrieveMarkets(
    indexes,
    arbiter,
    hatchery,
    ammFactory,
    cashes,
    provider
  );
  return { markets: { ...markets, ...marketInfos }, ammExchanges: exchanges, blocknumber };
};

const retrieveMarkets = async (
  indexes: number[],
  arbiterAddress: string,
  hatcheryAddress: string,
  ammFactoryAddress: string,
  cashes: Cashes,
  provider: Web3Provider
): Market[] => {
  const GET_TURBO = "getTurbo";
  const GET_SHARETOKENS = "getShareTokens";
  const POOLS = "pools";
  const multicall = new Multicall({ ethersProvider: provider });
  const contractMarketsCall: ContractCallContext[] = indexes.reduce(
    (p, index) => [
      ...p,
      {
        reference: `${arbiterAddress}-${index}`,
        contractAddress: arbiterAddress,
        abi: TrustedArbiterABI,
        calls: [
          {
            reference: `${arbiterAddress}-${index}`,
            methodName: GET_TURBO,
            methodParameters: [index],
            context: {
              index,
              hatcheryAddress,
            },
          },
        ],
      },
      {
        reference: `${hatcheryAddress}-${index}-sharetoken`,
        contractAddress: hatcheryAddress,
        abi: TurboHatcheryABI,
        calls: [
          {
            reference: `${hatcheryAddress}-${index}-sharetoken`,
            methodName: GET_SHARETOKENS,
            methodParameters: [index],
            context: {
              index,
              hatcheryAddress,
            },
          },
        ],
      },
      {
        reference: `${ammFactoryAddress}-${index}-pools`,
        contractAddress: ammFactoryAddress,
        abi: AmmFactoryABI,
        calls: [
          {
            reference: `${ammFactoryAddress}-${index}-pools`,
            methodName: POOLS,
            methodParameters: [hatcheryAddress, index],
            context: {
              index,
              hatcheryAddress,
            },
          },
        ],
      },
    ],
    []
  );
  let markets = [];
  const shareTokens = {};
  let exchanges = {};
  const cash = Object.values(cashes).find((c) => c.name === USDC); // todo: only supporting USDC currently, will change to multi collateral with new contract changes
  const marketsResult: ContractCallResults = await multicall.call(contractMarketsCall);
  for (let i = 0; i < Object.keys(marketsResult.results).length; i++) {
    const key = Object.keys(marketsResult.results)[i];
    const data = marketsResult.results[key].callsReturnContext[0].returnValues[0];
    const context = marketsResult.results[key].originalContractCallContext.calls[0].context;
    const method = String(marketsResult.results[key].originalContractCallContext.calls[0].methodName);
    const marketId = `${context.hatcheryAddress}-${context.index}`;

    if (method === GET_SHARETOKENS) {
      const shares = data;
      shareTokens[context.index] = shares;
    } else if (method === POOLS) {
      const id = data === NULL_ADDRESS ? null : data;
      exchanges[marketId] = {
        marketId,
        id,
        hatcheryAddress: hatcheryAddress,
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
      market.hatcheryAddress = hatcheryAddress;
      market.turboId = context.index;
      if (market) markets.push(market);
    }
  }

  // populate outcomes share token addresses
  if (Object.keys(shareTokens).length > 0) {
    for (let j = 0; j < markets.length; j++) {
      const m = markets[j];
      const tokens = shareTokens[m.turboId];
      tokens.forEach((t, i) => (m.outcomes[i].shareToken = t));
    }
  }

  const marketInfos = markets
    .filter((m) => m.description)
    .filter((m) => m.categories.length > 1)
    .reduce((p, m) => ({ ...p, [m.marketId]: m }), {});

  const blocknumber = marketsResult.blockNumber;

  if (Object.keys(exchanges).length > 0) {
    exchanges = await retrieveExchangeInfos(exchanges, marketInfos, hatcheryAddress, ammFactoryAddress, provider);
  }

  return { marketInfos, exchanges, blocknumber };
};

const retrieveExchangeInfos = async (
  exchanges: AmmExchanges,
  marketInfos: MarketInfos,
  hatcheryAddress: string,
  ammFactoryAddress: string,
  provider: Web3Provider
): Market[] => {
  const GET_PRICES = "prices";
  const GET_RATIOS = "tokenRatios";
  const GET_BALANCES = "getPoolBalances";
  const multicall = new Multicall({ ethersProvider: provider });
  const indexes = Object.keys(exchanges)
    .filter((k) => exchanges[k].id)
    .map((k) => exchanges[k].turboId);
  const contractMarketsCall: ContractCallContext[] = indexes.reduce(
    (p, index) => [
      ...p,
      {
        reference: `${ammFactoryAddress}-${index}-prices`,
        contractAddress: ammFactoryAddress,
        abi: AmmFactoryABI,
        calls: [
          {
            reference: `${ammFactoryAddress}-${index}-prices`,
            methodName: GET_PRICES,
            methodParameters: [hatcheryAddress, index],
            context: {
              index,
              hatcheryAddress,
            },
          },
        ],
      },
      {
        reference: `${ammFactoryAddress}-${index}-ratios`,
        contractAddress: ammFactoryAddress,
        abi: AmmFactoryABI,
        calls: [
          {
            reference: `${ammFactoryAddress}-${index}-ratios`,
            methodName: GET_RATIOS,
            methodParameters: [hatcheryAddress, index],
            context: {
              index,
              hatcheryAddress,
            },
          },
        ],
      },
      {
        reference: `${ammFactoryAddress}-${index}-balances`,
        contractAddress: ammFactoryAddress,
        abi: AmmFactoryABI,
        calls: [
          {
            reference: `${ammFactoryAddress}-${index}-balances`,
            methodName: GET_BALANCES,
            methodParameters: [hatcheryAddress, index],
            context: {
              index,
              hatcheryAddress,
            },
          },
        ],
      },
    ],
    []
  );
  const prices = {};
  const ratios = {};
  const balances = {};
  const marketsResult: ContractCallResults = await multicall.call(contractMarketsCall);
  for (let i = 0; i < Object.keys(marketsResult.results).length; i++) {
    const key = Object.keys(marketsResult.results)[i];
    const data = marketsResult.results[key].callsReturnContext[0].returnValues[0];
    const context = marketsResult.results[key].originalContractCallContext.calls[0].context;
    const method = String(marketsResult.results[key].originalContractCallContext.calls[0].methodName);
    const marketId = `${context.hatcheryAddress}-${context.index}`;

    if (method === GET_PRICES) {
      prices[marketId] = data;
    } else if (method === GET_RATIOS) {
      ratios[marketId] = data;
    } else if (method === GET_BALANCES) {
      balances[marketId] = data;
    }
  }

  Object.keys(exchanges).forEach((marketId) => {
    const exchange = exchanges[marketId];
    const outcomePrices = prices[marketId];
    const market = marketInfos[marketId];
    const { numTicks } = market;
    exchange.ammOutcomes = market.outcomes.map((o, i) => ({
      priceRaw: exchange.id ? String(outcomePrices[i]) : "",
      price: exchange.id ? toDisplayPrice(String(outcomePrices[i])) : "",
      ratioRaw: exchange.id ? String(ratios[marketId][i]) : "",
      ratio: exchange.id ? toDisplayRatio(String(ratios[marketId][i])) : "",
      balanceRaw: exchange.id ? String(balances[marketId][i]) : "",
      balance: exchange.id ? toDisplayBalance(String(balances[marketId][i]), numTicks) : "",
      ...o,
    }));
    // create cross reference
    exchange.market = market;
    market.amm = exchange;
  });

  return exchanges;
};

const decodeMarket = (marketData: any) => {
  let json = { categories: [], description: "", details: "" };
  try {
    json = JSON.parse(marketData[2]);
    if (json.categories && Array.isArray(json.categories)) {
      json.categories.map((c) => c.toLowerCase());
    } else {
      json.categories = [];
    }
  } catch (e) {
    console.error("can not parse extra info");
  }

  // todo: need to get market creation time
  const start = Math.floor(Date.now() / 1000);
  const outcomes = decodeOutcomes(marketData[4], marketData[5]);
  const reportingState = MARKET_STATUS.TRADING;
  const turboData = {
    endTimestamp: new BN(String(marketData["endTime"])).toNumber(),
    creationTimestamp: String(start),
    marketType: marketData["marketType"] || 1,
    numTicks: String(marketData["numTicks"]),
    totalStake: String(marketData["totalStake"]),
    winningPayoutHash: String(marketData["winningPayoutHash"]),
    description: json["description"],
    longDescription: json["details"],
    categories: json["categories"],
    reportingState,
    outcomes,
    settlementFee: String("creatorFee") || "0", // todo: get creation fee
  };
  return turboData;
};

const decodeOutcomes = (outcomeNames: string[], outcomeSymbols: string[]) => {
  return outcomeNames.map((outcome, i) => {
    const name = Buffer.from(outcome.replace("0x", ""), "hex").toString().trim().replace(/\0/g, "");
    const symbol = outcomeSymbols[i];
    return {
      id: i,
      name,
      symbol,
      isInvalid: i === INVALID_OUTCOME_ID,
      isWinner: false, // need to get based on winning payout hash
      isFinalNumerator: false, // need to translate final numerator payout hash to outcome
    };
  });
};

const toDisplayPrice = (onChainPrice: string = "0"): string => {
  // todo: need to use cash to get decimals
  return convertOnChainCashAmountToDisplayCashAmount(onChainPrice, 18).toFixed();
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
