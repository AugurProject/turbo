import { useReducer } from "react";
import {
  BETSLIP_ACTIONS,
  DEFAULT_BETSLIP_STATE,
  BETSLIP_STATE_KEYS,
  DEFAULT_BET,
  DEFAULT_ACTIVE_BET,
} from "./constants";
import { BETSLIP, ACTIVE_BETS } from "../constants";
import { windowRef, Stores } from "@augurproject/comps";
const {
  Utils: { dispatchMiddleware },
} = Stores;
const {
  TOGGLE_SELECTED_VIEW,
  ADD_BET,
  REMOVE_BET,
  UPDATE_BET,
  UPDATE_ACTIVE,
  CANCEL_ALL_BETS,
  ADD_ACTIVE,
  REMOVE_ACTIVE,
} = BETSLIP_ACTIONS;
const { SELECTED_VIEW, BETS, ACTIVE, SELECTED_COUNT } = BETSLIP_STATE_KEYS;

export function BetslipReducer(state, action) {
  const updatedState = { ...state };
  const date = new Date();
  const timestamp = Math.floor(date.getTime() / 1000);

  switch (action.type) {
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
      const { bet } = action;
      updatedState[ACTIVE] = {
        ...updatedState[ACTIVE],
        [`${bet.hash}`]: {
          ...DEFAULT_ACTIVE_BET,
          ...bet,
          timestamp,
        },
      };
      delete updatedState[BETS][bet.betId];
      break;
    }
    case REMOVE_ACTIVE: {
      delete updatedState[ACTIVE][action.hash];
      break;
    }
    case UPDATE_ACTIVE: {
      const { bet } = action;
      updatedState[ACTIVE][bet.hash] = {
        ...updatedState[ACTIVE][bet.hash],
        ...action.bet,
        timestamp,
      };
      break;
    }
    case CANCEL_ALL_BETS: {
      updatedState[BETS] = [];
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
      toggleSelectedView: () => dispatch({ type: TOGGLE_SELECTED_VIEW }),
      addBet: (bet) => dispatch({ type: ADD_BET, bet }),
      removeBet: (betId) => dispatch({ type: REMOVE_BET, betId }),
      updateBet: (bet) => dispatch({ type: UPDATE_BET, bet }),
      addActive: (bet) => dispatch({ type: ADD_ACTIVE, bet }),
      removeActive: (hash) => dispatch({ type: REMOVE_ACTIVE, hash }),
      cancelAllBets: () => dispatch({ type: CANCEL_ALL_BETS }),
      updateActive: (bet) => dispatch({ type: UPDATE_ACTIVE, bet }),
    },
  };
};
