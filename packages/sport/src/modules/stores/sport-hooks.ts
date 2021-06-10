import { useReducer } from "react";
import {
  SPORT_ACTIONS,
  DEFAULT_SPORT_STATE,
  SPORT_STATE_KEYS,
  LOCAL_STORAGE_SETTINGS_THEME,
  MarketEvents,
} from "./constants";
import { windowRef, Stores } from "@augurproject/comps";
const {
  Utils: { dispatchMiddleware, getSavedUserInfo },
} = Stores;
const {
  UPDATE_MARKET_EVENTS,
  UPDATE_SETTINGS,
  SET_SIDEBAR,
  SET_BETSLIP_MINIMIZED,
  UPDATE_MARKETS_VIEW_SETTINGS,
} = SPORT_ACTIONS;

const { MARKET_EVENTS, SETTINGS, SIDEBAR_TYPE, BETSLIP_MINIMIZED, MARKETS_VIEW_SETTINGS } = SPORT_STATE_KEYS;

const updateLocalStorage = (userAccount, updatedState) => {
  const userData = getSavedUserInfo(userAccount);
  if (userData) {
    window.localStorage.setItem(
      userAccount,
      JSON.stringify({
        ...userData,
        [LOCAL_STORAGE_SETTINGS_THEME]: updatedState[SETTINGS],
      })
    );
  } else if (!!userAccount) {
    window.localStorage.setItem(
      userAccount,
      JSON.stringify({
        account: userAccount,
        [LOCAL_STORAGE_SETTINGS_THEME]: updatedState[SETTINGS],
      })
    );
  }
};

export function SportReducer(state, action) {
  const updatedState = { ...state };
  switch (action.type) {
    case SET_SIDEBAR: {
      updatedState[SIDEBAR_TYPE] = action.sidebarType;
      break;
    }
    case SET_BETSLIP_MINIMIZED: {
      updatedState[BETSLIP_MINIMIZED] = action.betslipMinimized;
      break;
    }
    case UPDATE_MARKETS_VIEW_SETTINGS: {
      updatedState[MARKETS_VIEW_SETTINGS] = {
        ...updatedState[MARKETS_VIEW_SETTINGS],
        ...action[MARKETS_VIEW_SETTINGS],
      };
      break;
    }
    case UPDATE_SETTINGS: {
      updatedState[SETTINGS] = {
        ...state[SETTINGS],
        ...action[SETTINGS],
      };
      if (action.account) {
        updateLocalStorage(action.account, updatedState);
      }
      break;
    }
    case UPDATE_MARKET_EVENTS: {
      updatedState[MARKET_EVENTS] = {
        ...state[MARKET_EVENTS],
        ...action[MARKET_EVENTS],
      };
      break;
    }
    default:
      console.log(`Error: ${action.type} not caught by App Status reducer`);
  }
  windowRef.sport = updatedState;

  return updatedState;
}

export const useSport = (defaultState = DEFAULT_SPORT_STATE) => {
  const [state, pureDispatch] = useReducer(SportReducer, defaultState);
  const dispatch = dispatchMiddleware(pureDispatch);
  windowRef.sport = state;
  return {
    ...state,
    actions: {
      updateMarketsViewSettings: (marketsViewSettings) =>
        dispatch({ type: UPDATE_MARKETS_VIEW_SETTINGS, marketsViewSettings }),
      setBetslipMinimized: (betslipMinimized) => dispatch({ type: SET_BETSLIP_MINIMIZED, betslipMinimized }),
      setSidebar: (sidebarType) => dispatch({ type: SET_SIDEBAR, sidebarType }),
      updateSettings: (settings, account = null) => dispatch({ type: UPDATE_SETTINGS, settings, account }),
      updateMarketEvents: (marketEvents: MarketEvents) => dispatch({ type: UPDATE_MARKET_EVENTS, marketEvents }),
    },
  };
};
