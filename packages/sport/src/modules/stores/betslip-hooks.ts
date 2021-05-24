import { useReducer } from "react";
import { BETSLIP_ACTIONS, DEFAULT_BETSLIP_STATE, BETSLIP_STATE_KEYS } from "./constants";
import { BETSLIP, ACTIVE_BETS } from '../constants';
import { windowRef, Stores } from "@augurproject/comps";
const {
  Utils: { dispatchMiddleware },
} = Stores;
const { TOGGLE_SELECTED_VIEW } = BETSLIP_ACTIONS;
const { SELECTED_VIEW } = BETSLIP_STATE_KEYS;

export function BetslipReducer(state, action) {
  const updatedState = { ...state };
  switch (action.type) {
    case (TOGGLE_SELECTED_VIEW): {
      updatedState[SELECTED_VIEW] = state.selectedView === BETSLIP ? ACTIVE_BETS : BETSLIP;
      break;
    }
    default:
      console.log(`Error: ${action.type} not caught by App Status reducer`);
  }
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
      toggleSelectedView: () => dispatch({ type: TOGGLE_SELECTED_VIEW })
    },
  };
};
