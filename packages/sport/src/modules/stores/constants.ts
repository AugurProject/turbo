import { DEFAULT_MARKET_VIEW_SETTINGS, SETTINGS_SLIPPAGE } from "../constants";
import { Constants } from "@augurproject/comps";

export const STUBBED_SPORT_ACTIONS = {
  setSidebar: (sidebarType) => {},
  setBetslipMinimized: (betslipMinimized) => {},
  updateSettings: (settings, account = null) => {},
  updateMarketsViewSettings: (settings) => {},
};

export const DEFAULT_SPORT_STATE = {
  sidebarType: null,
  betslipMinimized: false,
  marketsViewSettings: DEFAULT_MARKET_VIEW_SETTINGS,
  settings: {
    slippage: SETTINGS_SLIPPAGE,
    timeFormat: Constants.TWELVE_HOUR_TIME,
    oddsFormat: Constants.ODDS_TYPE.DECIMAL,
    showLiquidMarkets: false,
  },
};

export const SPORT_STATE_KEYS = {
  SIDEBAR_TYPE: "sidebarType",
  BETSLIP_MINIMIZED: "betslipMinimized",
  SETTINGS: "settings",
  TIME_FORMAT: "timeFormat",
  ODDS_FORMAT: "oddsFormat",
  MARKETS_VIEW_SETTINGS: 'marketsViewSettings',
};

export const SPORT_ACTIONS = {
  UPDATE_SETTINGS: "UPDATE_SETTINGS",
  SET_SIDEBAR: "SET_SIDEBAR",
  SET_BETSLIP_MINIMIZED: "SET_BETSLIP_MINIMIZED",
  UPDATE_MARKETS_VIEW_SETTINGS: "UPDATE_MARKETS_VIEW_SETTINGS",
};

export const DEFAULT_BETSLIP_STATE = {

};

export const STUBBED_BETSLIP_ACTIONS = {

};

export const BETSLIP_STATE_KEYS = {

};

export const BETSLIP_ACTIONS = {

};