import { useReducer } from "react";
import { BETSLIP_ACTIONS, DEFAULT_BETSLIP_STATE, BETSLIP_STATE_KEYS, DEFAULT_BET } from "./constants";
import { BETSLIP, ACTIVE_BETS } from "../constants";
import { windowRef, Stores } from "@augurproject/comps";
const {
  Utils: { dispatchMiddleware },
} = Stores;
const {
  SET_ODDS_CHANGED_MESSAGE,
  TOGGLE_SELECTED_VIEW,
  ADD_BET,
  REMOVE_BET,
  UPDATE_BET,
  UPDATE_ACTIVE,
  CANCEL_ALL_BETS,
  ADD_ACTIVE,
  REMOVE_ACTIVE,
  CLEAR_BETSLIP,
} = BETSLIP_ACTIONS;
const { SELECTED_VIEW, BETS, ACTIVE, SELECTED_COUNT, ODDS_CHANGED_MESSAGE } = BETSLIP_STATE_KEYS;

export function BetslipReducer(state, action) {
  const updatedState = { ...state };
  const date = new Date();
  const timestamp = Math.floor(date.getTime() / 1000);

  switch (action.type) {
    case SET_ODDS_CHANGED_MESSAGE: {
      updatedState[ODDS_CHANGED_MESSAGE] = action.message;
      break;
    }
    case TOGGLE_SELECTED_VIEW: {
      updatedState[SELECTED_VIEW] = state.selectedView === BETSLIP ? ACTIVE_BETS : BETSLIP;
      break;
    }
    case ADD_BET: {
      const { bet } = action;
      const betId = `${bet.marketId}-${bet.id}`;
      updatedState[BETS] = {
        ...updatedState[BETS],
        [betId]: {
          ...DEFAULT_BET,
          ...bet,
          betId,
          timestamp,
        },
      };
      // always make sure to switch to betslip when adding bets.
      updatedState[SELECTED_VIEW] = BETSLIP;
      break;
    }
    case REMOVE_BET: {
      delete updatedState[BETS][action.betId];
      break;
    }
    case UPDATE_BET: {
      const { bet } = action;
      updatedState[BETS][bet.betId] = {
        ...updatedState[BETS][bet.betId],
        ...action.bet,
        timestamp,
      };
      break;
    }
    case ADD_ACTIVE: {
      const { bet, dontUpdateTime } = action;
      const extra = dontUpdateTime ? {} : { timestamp };
      updatedState[ACTIVE] = {
        ...updatedState[ACTIVE],
        [`${bet.betId}`]: {
          ...bet,
          ...extra,
        },
      };
      delete updatedState[BETS][bet.betId];
      break;
    }
    case REMOVE_ACTIVE: {
      delete updatedState[ACTIVE][action.betId];
      break;
    }
    case UPDATE_ACTIVE: {
      const { bet, dontUpdateTime } = action;
      const extra = dontUpdateTime ? {} : { timestamp };
      updatedState[ACTIVE][bet.betId] = {
        ...updatedState[ACTIVE][bet.betId],
        ...action.bet,
        ...extra,
      };
      break;
    }
    case CANCEL_ALL_BETS: {
      updatedState[BETS] = [];
      break;
    }
    case CLEAR_BETSLIP: {
      Object.keys(updatedState).forEach((key) => {
        updatedState[key] = DEFAULT_BETSLIP_STATE[key];
      });
      break;
    }
    default:
      console.log(`Error: ${action.type} not caught by App Status reducer`);
  }
  // finally always update the active count on any updates to betslip.
  updatedState[SELECTED_COUNT] = Object.keys(
    updatedState[updatedState[SELECTED_VIEW] === BETSLIP ? BETS : ACTIVE] || {}
  ).length;
  windowRef.betslip = updatedState;

  return updatedState;
}

export const useBetslip = (defaultState = DEFAULT_BETSLIP_STATE) => {
  const [state, pureDispatch] = useReducer(BetslipReducer, defaultState);
  const dispatch = dispatchMiddleware(pureDispatch);
  windowRef.betslip = state;
  return {
    ...state,
    actions: {
      setOddsChangedMessage: (message) => dispatch({ type: SET_ODDS_CHANGED_MESSAGE, message }),
      toggleSelectedView: () => dispatch({ type: TOGGLE_SELECTED_VIEW }),
      addBet: (bet) => dispatch({ type: ADD_BET, bet }),
      removeBet: (betId) => dispatch({ type: REMOVE_BET, betId }),
      updateBet: (bet) => dispatch({ type: UPDATE_BET, bet }),
      addActive: (bet, dontUpdateTime = false) => dispatch({ type: ADD_ACTIVE, bet, dontUpdateTime }),
      removeActive: (betId) => dispatch({ type: REMOVE_ACTIVE, betId }),
      cancelAllBets: () => dispatch({ type: CANCEL_ALL_BETS }),
      updateActive: (bet, dontUpdateTime = false) => dispatch({ type: UPDATE_ACTIVE, bet, dontUpdateTime }),
      clearBetslip: () => dispatch({ type: CLEAR_BETSLIP }),
    },
  };
};
