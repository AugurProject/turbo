import { BUY, SELL, USDC, TransactionTypes } from "../utils/constants";
import { getDayFormat, getDayTimestamp, getTimeFormat } from "../utils/date-utils";
import { MarketInfo, ActivityData, AmmTransaction, Cash } from "../types";
import {
  convertOnChainCashAmountToDisplayCashAmount,
  formatCash,
  formatCashPrice,
  formatSimpleShares,
  formatLpTokens,
  formatPercent,
  isSameAddress,
  sharesOnChainToDisplay,
} from "../utils/format-number";
import { createBigNumber } from "../utils/create-big-number";

export const shapeUserActvity = (
  account: string,
  markets: { [id: string]: MarketInfo },
  transactions: any,
  cashes: Array<Cash>,
  timeFormat?: string
): ActivityData[] => {
  let userTransactions = [];
  const usdc = Object.entries(cashes).find((cash) => cash[1].name === USDC)[1];
  for (const marketTransactions in transactions) {
    const marketTrades =
      transactions[marketTransactions].trades?.filter((trade) => isSameAddress(trade.user, account)) || [];
    const adds = (
      transactions[marketTransactions].addLiquidity?.filter((transaction) =>
        isSameAddress(transaction.sender.id, account)
      ) || []
    ).map((tx) => {
      tx.tx_type = TransactionTypes.ADD_LIQUIDITY;
      return tx;
    });
    const removes = (
      transactions[marketTransactions].removeLiquidity?.filter((transaction) =>
        isSameAddress(transaction.sender.id, account)
      ) || []
    ).map((tx) => {
      tx.tx_type = TransactionTypes.REMOVE_LIQUIDITY;
      return tx;
    });
    userTransactions = userTransactions.concat(marketTrades).concat(adds).concat(removes);
  }
  const processedFees = (transactions?.claimedFees || []).map((tx) => (tx.tx_type = `Claimed Fees`));
  const processedProceeds = (transactions?.claimedProceeds || []).map((tx) => (tx.tx_type = `Claimed Proceeds`));
  userTransactions.concat(processedFees).concat(processedProceeds);
  return formatUserTransactionActvity(account, markets, userTransactions, usdc, timeFormat);
};

const getActivityType = (
  tx: AmmTransaction,
  cash: Cash,
  market: MarketInfo
): {
  type: string;
  subheader: string;
  value: string;
} => {
  let type = null;
  let subheader = null;
  let value = null;
  switch (tx.tx_type) {
    case TransactionTypes.ADD_LIQUIDITY: {
      type = "Add Liquidity";
      const collateral = convertOnChainCashAmountToDisplayCashAmount(tx?.collateral, cash.decimals);
      const lpTokens = formatLpTokens(convertOnChainCashAmountToDisplayCashAmount(createBigNumber(tx?.lpTokens).abs()), { 
        decimals: 2,
        decimalsRounded: 0,
        denomination: v => `${v}%`,
        roundDown: false,
        bigUnitPostfix: false,
      }).full;
      value = `${formatCash(String(collateral.abs()), cash.name).full}`;
      subheader = `Contributed ${lpTokens} of the pool.`;
      break;
    }
    case TransactionTypes.REMOVE_LIQUIDITY: {
      type = "Remove Liquidity";
      const collateral = convertOnChainCashAmountToDisplayCashAmount(tx?.collateral, cash.decimals);
      const lpTokens = formatLpTokens(convertOnChainCashAmountToDisplayCashAmount(createBigNumber(tx?.lpTokens).abs()), { 
        decimals: 2,
        decimalsRounded: 0,
        denomination: v => `${v}%`,
        roundDown: false,
        bigUnitPostfix: false,
      }).full;
      value = `${formatCash(String(collateral.abs()), cash.name).full}`;
      subheader = `Withdrew ${lpTokens} of the pool.`;
      break;
    }
    default: {
      const shares = sharesOnChainToDisplay(createBigNumber(tx?.shares));
      const collateral = convertOnChainCashAmountToDisplayCashAmount(tx?.collateral, cash.decimals);
      const isBuy = collateral.lt(0);
      const shareType = market?.outcomes?.find((o) => o.id === createBigNumber(tx?.outcome).toNumber())?.name;
      const formattedPrice = formatCashPrice(tx.price, cash.name);
      subheader = `${formatSimpleShares(String(shares)).full} Shares of ${shareType} @ ${formattedPrice.full}`;
      // when design wants to add usd value
      value = `${formatCash(String(collateral.abs()), cash.name).full}`;
      type = isBuy ? BUY : SELL;
      break;
    }
  }
  return {
    type,
    value,
    subheader,
  };
};

export const formatUserTransactionActvity = (
  account: string,
  markets: { [id: string]: MarketInfo },
  transactions: Array<AmmTransaction>,
  cash: Cash,
  timeFormat?: string
): ActivityData[] => {
  if (!account) return [];
  if (!transactions || transactions.length === 0) return [];

  const formattedTransactions = transactions
    .reduce((p, transaction) => {
      const cashName = cash?.name;
      let datedUserTx = null;
      switch (transaction.tx_type) {
        case "Claimed Proceeds": {
          console.log("proceeds", transaction);
          break;
        }
        case "Claimed Fees": {
          console.log("fees", transaction);
          break;
        }
        default: {
          const market = markets[`${transaction?.marketId?.id}`];
          const typeDetails = getActivityType(transaction, cash, market);
          if (!market) {
            break;
          }
          datedUserTx = {
            id: transaction.id,
            currency: cashName,
            description: market?.description,
            title: market?.title,
            ...typeDetails,
            date: getDayFormat(transaction.timestamp),
            sortableMonthDay: getDayTimestamp(transaction.timestamp),
            time: getTimeFormat(transaction.timestamp, timeFormat),
            txHash: transaction.transactionHash,
            timestamp: Number(transaction.timestamp),
          };
          break;
        }
      }

      // const claims = markets[
      //   `${transaction.marketId}-${transaction.id}`
      // ].claimedProceeds.filter((c) => isSameAddress(c.user, account) && c.cash.name === cashName);
      // if (claims.length === 0) return p;

      // const userClaims = claims.map((c) => {
      //   return {
      //     id: c.id,
      //     currency: cashName,
      //     description:
      //       markets[`${exchange.marketId}-${exchange.id}`]?.description,
      //     type: `Claim Proceeds`,
      //     date: getDayFormat(c.timestamp),
      //     sortableMonthDay: getDayTimestamp(String(c.timestamp)),
      //     time: getTimeFormat(c.timestamp),
      //     txHash: null,
      //     timestamp: Number(c.timestamp),
      //     value: `${formatCash(c.winnings, c.cash.name).full}`,
      //   };
      // });
      // const datedUserTx = [transaction].map((t) => {

      //   if (!market) {
      //     return null;
      //   }
      //   return {
      //     id: t.id,
      //     currency: cashName,
      //     description: market?.description,
      //     title: market?.title,
      //     ...typeDetails,
      //     date: getDayFormat(t.timestamp),
      //     sortableMonthDay: getDayTimestamp(t.timestamp),
      //     time: getTimeFormat(t.timestamp, timeFormat),
      //     txHash: t.transactionHash,
      //     timestamp: Number(t.timestamp),
      //   };
      // });
      return [...p, datedUserTx];
      // return [...p, ...datedUserTx, ...userClaims];
    }, [])
    .sort((a, b) => (a?.timestamp < b?.timestamp ? 1 : -1));

  // form array of grouped by date activities
  return [...formattedTransactions]
    .reduce((p, t) => {
      const item = p.find((x) => x.date === t.date);
      if (item) {
        item.activity.push(t);
        return p;
      }
      if (t === null) return [...p];
      return [
        ...p,
        {
          date: t.date,
          sortableMonthDay: t.sortableMonthDay,
          activity: [t],
        },
      ];
    }, [])
    .sort((a, b) => (a.sortableMonthDay < b.sortableMonthDay ? 1 : -1));
};
