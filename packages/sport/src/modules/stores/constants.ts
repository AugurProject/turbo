import { SETTINGS_SLIPPAGE } from "../constants";
import { Constants } from "@augurproject/comps";

export const STUBBED_SPORT_ACTIONS = {
  setSidebar: (sidebarType) => {},
  setShowTradingForm: (showTradingForm) => {},
  updateSettings: (settings, account = null) => {},
};

export const DEFAULT_SPORT_STATE = {
  sidebarType: null,
  showTradingForm: false,
  settings: {
    slippage: SETTINGS_SLIPPAGE,
    timeFormat: Constants.TWELVE_HOUR_TIME,
    oddsFormat: Constants.ODDS_TYPE.DECIMAL,
  },
};

export const SPORT_STATE_KEYS = {
  SIDEBAR_TYPE: "sidebarType",
  SHOW_TRADING_FORM: "showTradingForm",
  SETTINGS: "settings",
  TIME_FORMAT: "timeFormat",
  ODDS_FORMAT: "oddsFormat",
};

export const SPORT_ACTIONS = {
  UPDATE_SETTINGS: "UPDATE_SETTINGS",
  SET_SIDEBAR: "SET_SIDEBAR",
  SET_SHOW_TRADING_FORM: "SET_SHOW_TRADING_FORM",
  UPDATE_MARKETS_VIEW_SETTINGS: "UPDATE_MARKETS_VIEW_SETTINGS",
};
