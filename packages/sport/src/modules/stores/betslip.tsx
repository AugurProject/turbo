import React, { useEffect } from "react";
import { BigNumber as BN } from "bignumber.js";
import { DEFAULT_BETSLIP_STATE, STUBBED_BETSLIP_ACTIONS } from "../stores/constants";
import { useBetslip } from "./betslip-hooks";
import { useUserStore, useDataStore, Formatter, Constants } from "@augurproject/comps";
import { useSportsStore } from "./sport";
import { AmmMarketShares, PositionBalance } from "@augurproject/comps/build/types";
import { estimatedCashOut, isCashOutApproved } from "modules/utils";
import { TX_STATUS } from "modules/constants";
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

const usePersistentActiveBets = ({ active, actions: { updateActive, addActive, removeActive } }) => {
  const { marketEvents } = useSportsStore();
  const {
    account,
    balances: { marketShares },
    loginAccount,
    transactions: userTransactions
  } = useUserStore();
  const { markets, transactions, blocknumber } = useDataStore();

  useEffect(async () => {
    if (!account) return null;
    const marketPositions = Object.keys(marketShares).reduce((p, marketId) => {
      const userMarketShares = marketShares as AmmMarketShares;
      const marketPositions = userMarketShares[marketId];
      const { market } = marketPositions.ammExchange;
      if (market.hasWinner) return p;

      return [...p, ...marketPositions.positions.map(pos => ({ ...pos, marketId: market.marketId }))];
    }, []);

    const bets = [];
    for (let i = 0; i < marketPositions.length; i++) {
      const position = marketPositions[i];
      const marketId = position.marketId
      const market = markets[marketId];
      const marketTrades = transactions?.[marketId]?.trades;
      const mostRecentUserTrade = marketTrades
        ?.filter((t) => isSameAddress(t.user, account))
        ?.filter((ut) => new BN(position.outcomeId).eq(new BN(ut.outcome)))
        .sort((a, b) => Number(a.timestamp) - Number(b.timestamp))[0];
      const marketEvent = marketEvents[market.eventId];
      const toWin = new BN(position.quantity).minus(new BN(position.initCostUsd));
      const { name } = market.outcomes.find(outcome => outcome.id === position.outcomeId);
      const cashoutAmount = estimatedCashOut(market.amm, position.quantity, position.outcomeId);
      const isApproved = await isCashOutApproved(loginAccount, position.outcomeId, market, transactions);
      const betId = `${market.marketId}-${position.outcomeId}`;
      const activeBet = active[betId];
      const status = userTransactions.find((t) => t.hash === activeBet?.hash)?.status || TX_STATUS.CONFIRMED;

      bets.push({
        heading: `${marketEvent?.description}`,
        subHeading: `${SPORTS_MARKET_TYPE_LABELS[market.sportsMarketType]}`,
        name,
        price: position.avgPrice,
        wager: formatDai(position.initCostUsd).formatted,
        toWin: formatDai(toWin).formatted,
        timestamp: mostRecentUserTrade ? mostRecentUserTrade?.timestamp : null,
        hash: mostRecentUserTrade ? mostRecentUserTrade?.transactionHash : null,
        betId,
        marketId: market.marketId,
        size: position.quantity,
        outcomeId: position.outcomeId,
        cashoutAmount,
        canCashOut: cashoutAmount !== null,
        isPending: status === TX_STATUS.PENDING,
        isApproved,
        status,
      });
    }


    // remove cashed out bets
    const keys = bets.map(b => b.betId);
    const betIds = Object.keys(active).filter(betId => active[betId].status !== TX_STATUS.PENDING)
      .filter(betId => !keys.includes(betId));
    betIds.map(betId => removeActive(betId));

    if (bets.length) {
      bets.forEach((bet) => {
        active[bet.betId] ? updateActive(bet, true) : addActive(bet, true);
      });
    }
  }, [account, blocknumber]);
};

const useClearOnLogout = ({ actions: { clearBetslip } }) => {
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
