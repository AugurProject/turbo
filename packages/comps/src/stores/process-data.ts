import { BUY, SELL, TransactionTypes } from "../utils/constants";
import { getDayFormat, getDayTimestamp, getTimeFormat } from "../utils/date-utils";
import { AmmExchange, MarketInfo, ActivityData, AmmTransaction, Cash } from "../types";
import { convertOnChainCashAmountToDisplayCashAmount, convertOnChainSharesToDisplayShareAmount, formatCash, formatCashPrice, formatSimpleShares, isSameAddress, sharesOnChainToDisplay } from "../utils/format-number";
import { createBigNumber } from "../utils/create-big-number";

export const shapeUserActvity = (
  account: string,
  markets: { [id: string]: MarketInfo },
  transactions: any,
  cashes: Array<Cash>,
  timeFormat?: string
): ActivityData[] => {
  let userTransactions = [];
  const usdc = cashes["0x5B9a38Bf07324B2Ff946F1ccdBD4698A8BC6c952"];
  for (const marketTransactions in transactions) {
    const marketTrades =
      transactions[marketTransactions].trades?.filter((trade) => isSameAddress(trade.user, account)) || [];
    const adds =
      transactions[marketTransactions].addLiquidity?.filter((transaction) =>
        isSameAddress(transaction.sender.id, account)
      ) || [].map(tx => tx.tx_type = TransactionTypes.ADD_LIQUIDITY);
    const removes =
      transactions[marketTransactions].removeLiquidity?.filter((transaction) =>
        isSameAddress(transaction.sender.id, account)
      ) || [].map(tx => tx.tx_type = TransactionTypes.REMOVE_LIQUIDITY);
    userTransactions = userTransactions.concat(marketTrades).concat(adds).concat(removes);
  }
  
  return formatUserTransactionActvity(account, markets, userTransactions, usdc, timeFormat);
};
// date?: string;
// sortableMonthDay?: number;
// activity?: ActivityItem[];

const getActivityType = (
  tx: AmmTransaction,
  cash: Cash,
  market: MarketInfo,
): {
  type: string;
  subheader: string;
  value: string;
} => {
  let type = null;
  let subheader = null;
  let value = null;
  console.log("in activityTypeFormer thing", tx);
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
      const shares = sharesOnChainToDisplay(createBigNumber(tx.shares));
      const collateral = convertOnChainCashAmountToDisplayCashAmount(tx.collateral, cash.decimals);
      const isBuy = collateral.lt(0);
      const shareType = market?.outcomes?.find(o => o.id === createBigNumber(tx.outcome).toNumber())?.name;
      console.log(shareType);
      const formattedPrice = formatCashPrice(tx.price, cash.name);
      subheader = `${formatSimpleShares(String(shares)).full
        } Shares of ${shareType} @ ${formattedPrice.full}`;
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
        const market = markets[`${transaction.marketId.id}`];
        console.log("datedUserTx", market);
        const typeDetails = getActivityType(t, cash, market);
        return {
          id: t.id,
          currency: cashName,
          description:
            market?.description,
          title: market?.title,
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
