import React, { useEffect } from "react";
import { DEFAULT_BETSLIP_STATE, STUBBED_BETSLIP_ACTIONS } from "../stores/constants";
import { useBetslip } from "./betslip-hooks";
import { useUserStore, useDataStore, Formatter, Constants } from "@augurproject/comps";
import { useSportsStore } from "./sport";
import { PositionBalance } from "@augurproject/comps/build/types";
import { getBuyAmount } from "modules/utils";
const { convertOnChainCashAmountToDisplayCashAmount, formatDai, isSameAddress } = Formatter;
const { SPORTS_MARKET_TYPE_LABELS, TX_STATUS } = Constants;
export const BetslipContext = React.createContext({
  ...DEFAULT_BETSLIP_STATE,
  actions: STUBBED_BETSLIP_ACTIONS,
});

export const BetslipStore = {
  actionsSet: false,
  get: () => ({ ...DEFAULT_BETSLIP_STATE }),
  actions: STUBBED_BETSLIP_ACTIONS,
};

const usePersistentActiveBets = ({ active, actions: { updateActive, addActive } }) => {
  const { marketEvents } = useSportsStore();
  const {
    account,
    balances: { marketShares },
  } = useUserStore();
  const { transactions } = useDataStore();
  useEffect(() => {
    if (!account) return null;
    const marketShareEntries: [string, { positions: PositionBalance[] }][] = Object.entries(marketShares);
    const onlyImportTransactions = marketShareEntries.map(([marketId, marketInfo]) => {
      const marketTrades = transactions?.[marketId]?.trades;
      const outcomeIdsToCareAbout = marketInfo?.positions?.reduce((acc, pos) => {
        const output = [].concat(acc);
        if (!output.includes(pos.outcomeId)) output.push(pos.outcomeId);
        return output;
      }, []);
      const mostRecentUserTrade = marketTrades
        ?.filter((t) => isSameAddress(t.user, account))
        ?.filter((ut) => outcomeIdsToCareAbout.includes(parseInt(ut.outcome)))
        .sort((a, b) => Number(a.timestamp) - Number(b.timestamp))[0];
      return mostRecentUserTrade;
    });
    const preparedActiveBets = onlyImportTransactions.map((lastTrade) => {
      const { ammExchange, positions } = marketShares[lastTrade.marketId.id];
      const { market } = ammExchange;
      const marketEvent = marketEvents[market.eventId];
      const tradeOutcomeId = parseInt(lastTrade.outcome);
      const outcomePosition = positions.find(p => p.outcomeId === tradeOutcomeId);
      const collateral = convertOnChainCashAmountToDisplayCashAmount(lastTrade?.collateral, 6);
      const toWin = getBuyAmount(ammExchange, tradeOutcomeId, outcomePosition?.initCostUsd);
      const { name } = ammExchange.ammOutcomes.find(outcome => outcome.id === tradeOutcomeId);
      const updatedActiveBet = {
        heading: `${marketEvent?.description}`,
        subHeading: `${SPORTS_MARKET_TYPE_LABELS[market.sportsMarketType]}`,
        name,
        price: lastTrade.price,
        wager: formatDai(collateral).formatted,
        toWin: formatDai(toWin?.maxProfit).formatted,
        timestamp: Number(lastTrade.timestamp),
        status: TX_STATUS.CONFIRMED,
        canCashOut: false,
        hasCashedOut: false,
        hash: lastTrade.transactionHash,
        betId: `${lastTrade.marketId.id}-${tradeOutcomeId}`,
      };
      return updatedActiveBet;
    });
    if (preparedActiveBets.length) {
      preparedActiveBets.forEach((bet) => {
        active[bet.hash] ? updateActive(bet, true) : addActive(bet, true);
      });
    }
  }, [account, Object.keys(marketShares).length, Object.keys(marketEvents).length]);
};

export const BetslipProvider = ({ children }: any) => {
  const state = useBetslip();

  usePersistentActiveBets(state);

  if (!BetslipStore.actionsSet) {
    BetslipStore.actions = state.actions;
    BetslipStore.actionsSet = true;
  }
  const readableState = { ...state };
  delete readableState.actions;
  BetslipStore.get = () => readableState;

  return <BetslipContext.Provider value={state}>{children}</BetslipContext.Provider>;
};

export const useBetslipStore = () => React.useContext(BetslipContext);
