import { BUY, SELL, TransactionTypes } from "../utils/constants";
import { getDayFormat, getDayTimestamp, getTimeFormat } from "../utils/date-utils";
import { AmmExchange, MarketInfo, ActivityData, AmmTransaction, Cash } from "../types";
import { convertOnChainCashAmountToDisplayCashAmount, convertOnChainSharesToDisplayShareAmount, formatCash, formatCashPrice, formatSimpleShares, isSameAddress } from "../utils/format-number";

export const shapeUserActvity = (
  account: string,
  markets: { [id: string]: MarketInfo },
  // ammExchanges: { [id: string]: AmmExchange },
  transactions: any,
  cashes: Array<Cash>,
  timeFormat?: string
): ActivityData[] => {
  let userTransactions = [];
  let trades = [];
  let addLiquidity = [];
  let removeLiquidity = [];
  const usdc = cashes["0x5B9a38Bf07324B2Ff946F1ccdBD4698A8BC6c952"];
  for (const marketTransactions in transactions) {
    // console.log("marketTransaction", transactions[marketTransactions]);
    const marketTrades =
      transactions[marketTransactions].trades?.filter((trade) => isSameAddress(trade.user, account)) || [];
    const adds =
      transactions[marketTransactions].addLiquidity?.filter((transaction) =>
        isSameAddress(transaction.sender.id, account)
      ) || [];
    const removes =
      transactions[marketTransactions].removeLiquidity?.filter((transaction) =>
        isSameAddress(transaction.sender.id, account)
      ) || [];
    // console.log("marketTrades", marketTrades);
    trades = trades.concat(marketTrades);
    addLiquidity = addLiquidity.concat(adds);
    removeLiquidity = removeLiquidity.concat(removes);
    userTransactions = userTransactions.concat(marketTrades).concat(adds).concat(removes);
  }
  // console.log("shapeUserActivity Called", account, transactions);
  // console.log("userTrades:", userTransactions);
  // if (userTransactions.length > 0) {
  //   console.log(getActivityType(userTransactions[0], usdc));
  //   console.log();
  // }
  // return [];
  return formatUserTransactionActvity(account, markets, userTransactions, usdc, timeFormat);
};
// date?: string;
// sortableMonthDay?: number;
// activity?: ActivityItem[];

const getActivityType = (
  tx: AmmTransaction,
  cash: Cash
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
      type = 'Add Liquidity';
      value = `${formatCash(tx.value, cash.name).full}`;
      break;
    }
    case TransactionTypes.REMOVE_LIQUIDITY: {
      type = 'Remove Liquidity';
      value = `${formatCash(tx.value, cash.name).full}`;
      break;
    }
    default: {
      const shares =
        tx.yesShares !== '0'
          ? convertOnChainSharesToDisplayShareAmount(
            tx.yesShares,
            cash.decimals
          )
          : convertOnChainSharesToDisplayShareAmount(
            tx.noShares,
            cash.decimals
          );
      const shareType = tx.yesShares !== '0' ? 'Yes' : 'No';
      const formattedPrice = formatCashPrice(tx.price, cash.name);
      subheader = `${formatSimpleShares(String(shares)).full
        } Shares of ${shareType} @ ${formattedPrice.full}`;
      // when design wants to add usd value
      const cashValue = convertOnChainCashAmountToDisplayCashAmount(
        tx.cash,
        cash.decimals
      );
      value = `${formatCash(String(cashValue.abs()), cash.name).full}`;
      type = tx.tx_type === TransactionTypes.ENTER ? BUY : SELL;
      break;
    }
  }
  return {
    type,
    value,
    subheader,
  };
};

// export const shapeUserActvity = (
//   account: string,
//   markets: { [id: string]: MarketInfo },
//   ammExchanges: { [id: string]: AmmExchange }
// ): ActivityData[] =>
//   formatUserTransactionActvity(account, markets, ammExchanges);

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

      const datedUserTx = transactions.map((t) => {
        const typeDetails = getActivityType(t, cash);
        return {
          id: t.id,
          currency: cashName,
          description:
            markets[`${transaction.marketId}-${transaction.id}`]?.description,
          ...typeDetails,
          date: getDayFormat(t.timestamp),
          sortableMonthDay: getDayTimestamp(t.timestamp),
          time: getTimeFormat(t.timestamp, timeFormat),
          txHash: t.transactionHash,
          timestamp: Number(t.timestamp),
        };
      });
      return [...p, ...datedUserTx];
      // return [...p, ...datedUserTx, ...userClaims];
    }, [])
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

  // form array of grouped by date activities
  return [...formattedTransactions]
    .reduce((p, t) => {
      const item = p.find((x) => x.date === t.date);
      if (item) {
        item.activity.push(t);
        return p;
      }
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
