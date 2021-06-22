import React, { useEffect } from "react";
import { BigNumber as BN } from "bignumber.js";
import { DEFAULT_BETSLIP_STATE, STUBBED_BETSLIP_ACTIONS } from "../stores/constants";
import { useBetslip } from "./betslip-hooks";
import { useUserStore, useDataStore, Formatter, Constants } from "@augurproject/comps";
import { useSportsStore } from "./sport";
import { PositionBalance } from "@augurproject/comps/build/types";
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
      const outcomeIdsToCareAbout = [...new Set(marketInfo?.positions?.map(pos => pos.outcomeId))];
      const mostRecentUserTrade = marketTrades
        ?.filter((t) => isSameAddress(t.user, account))
        ?.filter((ut) => outcomeIdsToCareAbout.includes(parseInt(ut.outcome)))
        .sort((a, b) => Number(a.timestamp) - Number(b.timestamp))[0];

      return mostRecentUserTrade;
    }).filter(m => m);

    const preparedActiveBets = onlyImportTransactions.map((lastTrade) => {
      const { ammExchange, positions } = marketShares[lastTrade.marketId.id];
      const { market } = ammExchange;
      const marketEvent = marketEvents[market.eventId];
      const tradeOutcomeId = parseInt(lastTrade.outcome);
      const outcomePosition: PositionBalance = positions.find(p => p.outcomeId === tradeOutcomeId);
      const collateral = convertOnChainCashAmountToDisplayCashAmount(lastTrade?.collateral, 6);
      // since trading in USDC one share max value is 1 USDC
      const toWin = new BN(outcomePosition.quantity).minus(new BN(outcomePosition.initCostUsd));
      const { name } = ammExchange.ammOutcomes.find(outcome => outcome.id === tradeOutcomeId);
      const updatedActiveBet = {
        heading: `${marketEvent?.description}`,
        subHeading: `${SPORTS_MARKET_TYPE_LABELS[market.sportsMarketType]}`,
        name,
        price: lastTrade.price,
        wager: formatDai(collateral.abs()).formatted,
        toWin: formatDai(toWin).formatted,
        timestamp: Number(lastTrade.timestamp),
        status: TX_STATUS.CONFIRMED,
        canCashOut: false,
        hasCashedOut: false,
        hash: lastTrade.transactionHash,
        betId: `${lastTrade.marketId.id}-${tradeOutcomeId}`,
        marketId: market.marketId,
        size: outcomePosition.quantity,
        outcomeId: outcomePosition.outcomeId,
        cashoutAmount: 0,
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
