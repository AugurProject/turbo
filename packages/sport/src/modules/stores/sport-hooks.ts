import { useReducer } from "react";
import { SPORT_ACTIONS, DEFAULT_SPORT_STATE, SPORT_STATE_KEYS } from "./constants";
import { windowRef, Stores } from "@augurproject/comps";
const {
  Utils: { dispatchMiddleware, getSavedUserInfo },
} = Stores;
const { UPDATE_SETTINGS, SET_SIDEBAR, SET_SHOW_TRADING_FORM } = SPORT_ACTIONS;

const { SETTINGS, SIDEBAR_TYPE, SHOW_TRADING_FORM } = SPORT_STATE_KEYS;

const updateLocalStorage = (userAccount, updatedState) => {
  const userData = getSavedUserInfo(userAccount);
  if (userData) {
    window.localStorage.setItem(
      userAccount,
      JSON.stringify({
        ...userData,
        settings: updatedState[SETTINGS],
      })
    );
  } else if (!!userAccount) {
    window.localStorage.setItem(
      userAccount,
      JSON.stringify({
        account: userAccount,
        settings: updatedState[SETTINGS],
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
    case SET_SHOW_TRADING_FORM: {
      updatedState[SHOW_TRADING_FORM] = action.showTradingForm;
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
      setShowTradingForm: (showTradingForm) => dispatch({ type: SET_SHOW_TRADING_FORM, showTradingForm }),
      setSidebar: (sidebarType) => dispatch({ type: SET_SIDEBAR, sidebarType }),
      updateSettings: (settings, account = null) => dispatch({ type: UPDATE_SETTINGS, settings, account }),
    },
  };
};
