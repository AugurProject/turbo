import React, { useEffect } from "react";
import { BigNumber as BN } from "bignumber.js";
import { DEFAULT_BETSLIP_STATE, STUBBED_BETSLIP_ACTIONS } from "../stores/constants";
import { useBetslip } from "./betslip-hooks";
import { useUserStore, useDataStore, Formatter, Constants } from "@augurproject/comps";
import { useSportsStore } from "./sport";
import { AmmMarketShares } from "@augurproject/comps/build/types";
import { estimatedCashOut } from "modules/utils";
const { formatDai, isSameAddress } = Formatter;
const { SPORTS_MARKET_TYPE_LABELS } = Constants;
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
    const preparedActiveBets = Object.keys(marketShares).reduce((p, marketId) => {
      const userMarketShares = marketShares as AmmMarketShares;
      const marketPositions = userMarketShares[marketId];
      const { market } = marketPositions.ammExchange;
      if (market.hasWinner) return p;
      const bets = marketPositions.positions.map(position => {
        const marketTrades = transactions?.[marketId]?.trades;
        const mostRecentUserTrade = marketTrades
          ?.filter((t) => isSameAddress(t.user, account))
          ?.filter((ut) => new BN(position.outcomeId).eq(new BN(ut.outcome)))
          .sort((a, b) => Number(a.timestamp) - Number(b.timestamp))[0];
        const marketEvent = marketEvents[market.eventId];
        const toWin = new BN(position.quantity).minus(new BN(position.initCostUsd));
        const { name } = market.outcomes.find(outcome => outcome.id === position.outcomeId);
        const cashoutAmount = estimatedCashOut(market.amm, position.quantity, position.outcomeId);

        return {
          heading: `${marketEvent?.description}`,
          subHeading: `${SPORTS_MARKET_TYPE_LABELS[market.sportsMarketType]}`,
          name,
          price: position.avgPrice,
          wager: formatDai(position.initCostUsd).formatted,
          toWin: formatDai(toWin).formatted,
          timestamp: mostRecentUserTrade ? mostRecentUserTrade?.timestamp : null,
          hash: mostRecentUserTrade ? mostRecentUserTrade?.transactionHash : null,
          betId: `${market.marketId}-${position.outcomeId}`,
          marketId: market.marketId,
          size: position.quantity,
          outcomeId: position.outcomeId,
          cashoutAmount,
          canCashOut: cashoutAmount !== null,
        };
      });
      return [...p, ...bets];
    }, []);

    if (preparedActiveBets.length) {
      preparedActiveBets.forEach((bet) => {
        active[bet.betId] ? updateActive(bet, true) : addActive(bet, true);
      });
    }
  }, [account, Object.keys(marketShares).length, Object.keys(marketEvents).length, Object.keys(transactions).length]);
};

const useClearOnLogout = ({ actions: { clearBetslip }}) => {
  const { account } = useUserStore();

  useEffect(() => {
    if (!account) {
      clearBetslip();
    }
  }, [account])
}

export const BetslipProvider = ({ children }: any) => {
  const state = useBetslip();

  useClearOnLogout(state);
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
