import React, { useEffect } from "react";
import { BigNumber as BN } from "bignumber.js";
import { DEFAULT_BETSLIP_STATE, STUBBED_BETSLIP_ACTIONS } from "../stores/constants";
import { useBetslip } from "./betslip-hooks";
import { useUserStore, useDataStore, Formatter, Constants } from "@augurproject/comps";
import { useSportsStore } from "./sport";
import { AmmMarketShares } from "@augurproject/comps/build/types";
import { estimatedCashOut, isCashOutApproved } from "modules/utils";
import { TX_STATUS } from "modules/constants";
const { formatCash, isSameAddress } = Formatter;
const { SPORTS_MARKET_TYPE_LABELS, USDC } = Constants;
export const BetslipContext = React.createContext({
  ...DEFAULT_BETSLIP_STATE,
  actions: STUBBED_BETSLIP_ACTIONS,
});

export const BetslipStore = {
  actionsSet: false,
  get: () => ({ ...DEFAULT_BETSLIP_STATE }),
  actions: STUBBED_BETSLIP_ACTIONS,
};

export const processClosedMarketShares = ({
  marketPositions,
  markets,
  account,
  transactions,
  marketEvents,
}) => {
  const bets = [];
  for (let i = 0; i < marketPositions.length; i++) {
    const position = marketPositions[i];
    const marketId = position.marketId;
    const market = markets[marketId];
    const isWinningOutcome = new BN(market?.winner).eq(new BN(position?.outcomeId));
    const marketTrades = transactions?.[marketId]?.trades;
    const mostRecentUserTrade = marketTrades
      ?.filter((t) => isSameAddress(t.user, account))
      ?.filter((ut) => new BN(position.outcomeId).eq(new BN(ut.outcome)))
      .sort((a, b) => Number(a.timestamp) - Number(b.timestamp))[0];
    const marketEvent = marketEvents[market.eventId];
    const toWin = new BN(position.quantity || 0).toFixed();
    const { name } = market.outcomes.find((outcome) => new BN(outcome.id).eq(new BN(position.outcomeId)));
    const cashoutAmount = isWinningOutcome
      ? toWin
      : new BN(position.initCostUsd || 0).toFixed();
    const betId = `${market.marketId}-${position.outcomeId}-${position.timestamp}-ms`;

    bets.push({
      heading: `${marketEvent?.description}`,
      subHeading: `${SPORTS_MARKET_TYPE_LABELS[market.sportsMarketType]}`,
      name,
      price: position.avgPrice,
      wager: formatCash(position.initCostUsd, USDC).formatted,
      toWin: isWinningOutcome ? formatCash(toWin, USDC).formatted : "0.00",
      timestamp: mostRecentUserTrade ? Number(mostRecentUserTrade?.timestamp) : null,
      hash: mostRecentUserTrade ? mostRecentUserTrade?.transactionHash : null,
      betId,
      marketId: market.marketId,
      size: position.quantity,
      outcomeId: position.outcomeId,
      cashoutAmount,
      cashoutAmountAbs: new BN(cashoutAmount).abs().toFixed(),
      canCashOut: false,
      isPending: false,
      status: TX_STATUS.CONFIRMED,
      isWinningOutcome,
      hasClaimed: false,
      isOpen: !market.hasWinner,
    });
  }

  return bets;
};

// closed position data from the graph
export const processClosedPositionBalances = ({
  marketPositions,
  markets,
  marketEvents,
}) => {
  const bets = [];
  for (let i = 0; i < marketPositions.length; i++) {
    const position = marketPositions[i];
    const marketId = position.marketId;
    const market = markets[marketId];
    const outcomeId = new BN(position.outcomeId).toNumber();
    const isWinningOutcome = new BN(market?.winner).eq(new BN(outcomeId));
    const marketEvent = marketEvents[market.eventId];
    const { name } = market.outcomes.find((outcome) => new BN(outcome.id).eq(new BN(outcomeId)));
    const cashoutAmount = new BN(position.payout || 0).minus(new BN(position.initCostUsd || 0));
    const betId = `${market.marketId}-${outcomeId}-${position.timestamp}`;

    bets.push({
      heading: `${marketEvent?.description}`,
      subHeading: `${SPORTS_MARKET_TYPE_LABELS[market.sportsMarketType]}`,
      name,
      price: position.avgPrice,
      wager: formatCash(position.initCostUsd, USDC).formatted,
      toWin: formatCash("0.00", USDC).formatted,
      timestamp: Number(position?.timestamp) || null,
      hash: position?.transactionHash,
      betId,
      marketId: market.marketId,
      size: position.quantity,
      outcomeId,
      cashoutAmount: cashoutAmount.toFixed(),
      cashoutAmountAbs: cashoutAmount.abs().toFixed(),
      canCashOut: false,
      isPending: false,
      status: TX_STATUS.CONFIRMED,
      isWinningOutcome,
      hasClaimed: true,
      isOpen: false,
      isCashout: !position.hasClaimed
    });
  }

  return bets;
};


const usePersistentActiveBets = ({ active, actions: { updateActive, addActive, removeActive } }) => {
  const { marketEvents } = useSportsStore();
  const {
    account,
    balances: { marketShares },
    loginAccount,
    transactions: userTransactions,
  } = useUserStore();
  const { markets, transactions, blocknumber } = useDataStore();

  useEffect(async () => {
    if (!account) return null;
    const marketPositions = Object.keys(marketShares).reduce((p, marketId) => {
      const userMarketShares = marketShares as AmmMarketShares;
      const marketPositions = userMarketShares[marketId];
      const { market } = marketPositions.ammExchange;

      return [...p, ...marketPositions.positions.map((pos) => ({ ...pos, marketId: market.marketId }))];
    }, []);
    const bets = [];
    for (let i = 0; i < marketPositions.length; i++) {
      const position = marketPositions[i];
      const marketId = position.marketId;
      const market = markets[marketId];
      const marketTrades = transactions?.[marketId]?.trades;
      const mostRecentUserTrade = marketTrades
        ?.filter((t) => isSameAddress(t.user, account))
        ?.filter((ut) => new BN(position.outcomeId).eq(new BN(ut.outcome)))
        .sort((a, b) => Number(a.timestamp) - Number(b.timestamp))[0];
      const marketEvent = marketEvents[market.eventId];
      const toWin = new BN(position.quantity || 0).minus(new BN(position.initCostUsd || 0));
      const { name } = market.outcomes.find((outcome) => outcome.id === position.outcomeId);
      const cashoutAmount = estimatedCashOut(market.amm, position.quantity, position.outcomeId);
      const isApproved = await isCashOutApproved(loginAccount, position.outcomeId, market, transactions);
      const betId = `${market.marketId}-${position.outcomeId}`;
      const activeBet = active[betId];
      const status = userTransactions.find((t) => t.hash === activeBet?.hash)?.status || TX_STATUS.CONFIRMED;

      if (market.hasWinner) continue;
      bets.push({
        heading: `${marketEvent?.description}`,
        subHeading: `${SPORTS_MARKET_TYPE_LABELS[market.sportsMarketType]}`,
        name,
        price: position.avgPrice,
        wager: formatCash(position.initCostUsd, USDC).formatted,
        toWin: formatCash(toWin, USDC).formatted,
        timestamp: mostRecentUserTrade ? mostRecentUserTrade?.timestamp : null,
        hash: mostRecentUserTrade ? mostRecentUserTrade?.transactionHash : null,
        betId,
        marketId: market.marketId,
        size: position.quantity,
        outcomeId: position.outcomeId,
        cashoutAmount,
        cashoutAmountAbs: new BN(cashoutAmount).abs().toFixed(),
        canCashOut: !market.hasWinner && cashoutAmount !== null,
        isPending: status === TX_STATUS.PENDING,
        isApproved,
        status,
        hasWinner: market.hasWinner,
        isOpen: !market.hasWinner,
      });
    }
    // remove cashed out bets
    const keys = bets.map((b) => b.betId);
    const betIds = Object.keys(active)
      .filter((betId) => active[betId].status !== TX_STATUS.PENDING)
      .filter((betId) => !keys.includes(betId));
    betIds.map((betId) => removeActive(betId));

    if (bets.length) {
      bets.forEach((bet) => {
        active[bet.betId] ? updateActive(bet, true) : addActive(bet, true);
      });
    }
  }, [account, blocknumber, Object.keys(marketShares).length]);
};

const useClearOnLogout = ({ actions: { clearBetslip } }) => {
  const { account } = useUserStore();

  useEffect(() => {
    if (!account) {
      clearBetslip();
    }
  }, [account]);
};

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
