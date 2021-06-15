import { DEFAULT_MARKET_VIEW_SETTINGS, SETTINGS_SLIPPAGE, BETSLIP, BETSIZE_TO_ODDS } from "../constants";
import { Constants } from "@augurproject/comps";

export const STUBBED_SPORT_ACTIONS = {
  setSidebar: (sidebarType) => {},
  setBetslipMinimized: (betslipMinimized) => {},
  updateSettings: (settings, account = null) => {},
  updateMarketsViewSettings: (settings) => {},
  updateMarketEvents: (marketEvents: MarketEvents) => {},
};

export const DEFAULT_SPORT_STATE = {
  sidebarType: null,
  betslipMinimized: false,
  marketsViewSettings: DEFAULT_MARKET_VIEW_SETTINGS,
  settings: {
    betSizeToOdds: BETSIZE_TO_ODDS,
    slippage: SETTINGS_SLIPPAGE,
    timeFormat: Constants.TWELVE_HOUR_TIME,
    oddsFormat: Constants.ODDS_TYPE.DECIMAL,
    showLiquidMarkets: true,
  },
  marketEvents: {},
};

export const LOCAL_STORAGE_SETTINGS_THEME = "sports_settings";

export const SPORT_STATE_KEYS = {
  SIDEBAR_TYPE: "sidebarType",
  BETSLIP_MINIMIZED: "betslipMinimized",
  SETTINGS: "settings",
  TIME_FORMAT: "timeFormat",
  ODDS_FORMAT: "oddsFormat",
  MARKETS_VIEW_SETTINGS: "marketsViewSettings",
  MARKET_EVENTS: "marketEvents",
};

export const SPORT_ACTIONS = {
  UPDATE_SETTINGS: "UPDATE_SETTINGS",
  SET_SIDEBAR: "SET_SIDEBAR",
  SET_BETSLIP_MINIMIZED: "SET_BETSLIP_MINIMIZED",
  UPDATE_MARKETS_VIEW_SETTINGS: "UPDATE_MARKETS_VIEW_SETTINGS",
  UPDATE_MARKET_EVENTS: "UPDATE_MARKET_EVENTS",
};

export interface MarketEvent {
  eventId: string;
  description: string;
  startTimestamp: number;
  categories: string[];
  hasWinner: boolean;
  marketIds: string[];
  spreadLine: number | null;
  overUnderLine: number | null;
  outcomes: Array<{ id: number, name: string }>;
}

export interface MarketEvents {
  [eventId: string]: MarketEvent;
}
export interface BetType {
  id: number;
  heading?: string;
  subHeading?: string;
  wager: string | null;
  toWin: string | null;
  price: string;
  name: string;
  betId: string;
  marketId: string;
}

export interface ActiveBetType {
  id: number;
  heading: string;
  wager: string;
  toWin: string;
  price: string;
  betId: string;
  name: string;
  marketId: string;
  status: string;
  canCashOut: boolean;
  hasCashedOut: boolean;
  hash: string;
}

const { TX_STATUS } = Constants;

export const DEFAULT_BET = {
  wager: null,
  toWin: null,
};

export const DEFAULT_ACTIVE_BET = {
  status: TX_STATUS.PENDING,
  canCashOut: false,
  hasCashedOut: false,
};

export const DEFAULT_BETSLIP_STATE = {
  selectedView: BETSLIP,
  selectedCount: 0,
  bets: {},
  active: {},
};
/*
const date = new Date();
const now = Math.floor(date.getTime() / 1000);

export const DEFAULT_BETSLIP_STATE = {
  selectedView: BETSLIP,
  selectedCount: 1,
  bets: {
    "0xdeadbeef-0-2": {
      heading: "Who will win? JD vs Life, Over Under",
      marketId: "0xdeadbeef-0",
      id: 2,
      name: "Life, +12.5",
      price: "0.125",
      timestamp: now,
      wager: null,
      toWin: null,
      betId: "0xdeadbeef-0-2",
    },
  },
  active: {
    "0xtxHash05": {
      heading: "Who will win? JD vs Life, Over Under",
      marketId: "0xdeadbeef-0",
      id: 2,
      name: "Life, +12.5",
      price: "0.3",
      wager: "500.00",
      toWin: "1337.00",
      timestamp: now,
      status: TX_STATUS.PENDING,
      canCashOut: false,
      hasCashedOut: false,
      hash: "0xtxHash05",
      betId: "0xdeadbeef-0-2",
    },
    "0xtxHash04": {
      heading: "Who will win? JD vs Life, Over Under",
      marketId: "0xdeadbeef-0",
      id: 2,
      name: "Life, +12.5",
      price: "0.35",
      wager: "200.00",
      toWin: "325.00",
      timestamp: now - 100,
      status: TX_STATUS.CONFIRMED,
      canCashOut: true,
      hasCashedOut: false,
      hash: "0xtxHash04",
      betId: "0xdeadbeef-0-2",
    },
    "0xtxHash03": {
      heading: "Who will win? JD vs Life, Over Under",
      marketId: "0xdeadbeef-0",
      id: 2,
      name: "Life, +12.5",
      price: "0.35",
      wager: "200.00",
      toWin: "325.00",
      timestamp: now - 200,
      status: TX_STATUS.CONFIRMED,
      canCashOut: true,
      hasCashedOut: false,
      hash: "0xtxHash03",
      betId: "0xdeadbeef-0-2",
    },
    "0xtxHash02": {
      heading: "Who will win? JD vs Life, Over Under",
      marketId: "0xdeadbeef-0",
      id: 2,
      name: "Life, +12.5",
      price: "0.35",
      wager: "200.00",
      toWin: "325.00",
      timestamp: now - 300,
      status: TX_STATUS.CONFIRMED,
      canCashOut: false,
      hasCashedOut: true,
      hash: "0xtxHash02",
      betId: "0xdeadbeef-0-2",
    },
    "0xtxHash01": {
      heading: "Who will win? JD vs Life, Over Under",
      marketId: "0xdeadbeef-0",
      id: 2,
      name: "Life, +12.5",
      price: "0.55",
      wager: "10.00",
      toWin: "9.00",
      timestamp: now - 400,
      status: TX_STATUS.FAILURE,
      canCashOut: false,
      hasCashedOut: false,
      hash: "0xtxHash01",
      betId: "0xdeadbeef-0-2",
    },
  },
};
*/
export const STUBBED_BETSLIP_ACTIONS = {
  toggleSelectedView: () => {},
  addBet: (bet) => {},
  removeBet: (betId) => {},
  updateBet: (bet) => {},
  addActive: (bet) => {},
  removeActive: (hash) => {},
  updateActive: (bet) => {},
  cancelAllBets: () => {},
};

export const BETSLIP_STATE_KEYS = {
  SELECTED_VIEW: "selectedView",
  SELECTED_COUNT: "selectedCount",
  BETS: "bets",
  ACTIVE: "active",
};

export const BETSLIP_ACTIONS = {
  TOGGLE_SELECTED_VIEW: "TOGGLE_SELECTED_VIEW",
  ADD_BET: "ADD_BET",
  REMOVE_BET: "REMOVE_BET",
  UPDATE_BET: "UPDATE_BET",
  ADD_ACTIVE: "ADD_ACTIVE",
  REMOVE_ACTIVE: "REMOVE_ACTIVE",
  UPDATE_ACTIVE: "UPDATE_ACTIVE",
  CANCEL_ALL_BETS: "CANCEL_ALL_BETS",
};
