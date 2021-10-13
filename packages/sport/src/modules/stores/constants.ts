import { DEFAULT_MARKET_VIEW_SETTINGS, SETTINGS_SLIPPAGE, BETSLIP, BETSIZE_TO_ODDS } from "../constants";
import { Constants } from "@augurproject/comps";

export const STUBBED_SPORT_ACTIONS = {
  setSidebar: (sidebarType) => {},
  setBetslipMinimized: (betslipMinimized) => {},
  updateSettings: (settings, account = null) => {},
  updateMarketsViewSettings: (settings) => {},
  updateMarketEvents: (marketEvents: MarketEvents) => {},
  setFilteredEvents: (filteredEvents: MarketEvents[]) => {},
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
    theme: Constants.THEME_OPTIONS.LIGHT,
  },
  marketEvents: {},
  filteredEvents: [],
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
  FILTERED_EVENTS: "filteredEvents",
};

export const SPORT_ACTIONS = {
  UPDATE_SETTINGS: "UPDATE_SETTINGS",
  SET_SIDEBAR: "SET_SIDEBAR",
  SET_BETSLIP_MINIMIZED: "SET_BETSLIP_MINIMIZED",
  UPDATE_MARKETS_VIEW_SETTINGS: "UPDATE_MARKETS_VIEW_SETTINGS",
  UPDATE_MARKET_EVENTS: "UPDATE_MARKET_EVENTS",
  SET_FILTERED_EVENTS: "SET_FILTERED_EVENTS",
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
  outcomes: Array<{ id: number; name: string }>;
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
  size?: string;
  wagerAvgPrice: string | null;
  name: string;
  betId: string;
  marketId: string;
  hash?: string;
}
export interface BetStateType {
  [betId: string]: BetType;
}

export interface ActiveBetType {
  id: number;
  heading: string;
  wager: string;
  toWin: string;
  price: string;
  betId: string;
  name: string;
  size?: string;
  wagerAvgPrice?: string;
  marketId: string;
  canCashOut: boolean;
  hash: string;
  outcomeId: number;
  isApproved: boolean;
  cashoutAmount: string;
  isPending: boolean;
  status: string;
  hasWinner?: boolean;
  cashoutAmountAbs?: string;
  hasClaimed: boolean;
  isOpen: boolean;
  isWinningOutcome: boolean;
  isCashout: boolean;
}
export interface ActiveBetStateType {
  [betId: string]: ActiveBetType;
}

export interface BetslipStateType {
  betsChangedMessages: { [betId: string]: string };
  selectedView: string;
  selectedCount: number;
  bets: BetStateType;
  active: ActiveBetStateType;
}

export const DEFAULT_BET = {
  wager: null,
  toWin: null,
  wagerAvgPrice: null,
};

export const DEFAULT_BETSLIP_STATE: BetslipStateType = {
  betsChangedMessages: {},
  selectedView: BETSLIP,
  selectedCount: 0,
  bets: {},
  active: {},
};

export const STUBBED_BETSLIP_ACTIONS = {
  setBetsChangedMessages: (betsChangedMessages = {}) => {},
  toggleSelectedView: () => {},
  addBet: (bet) => {},
  removeBet: (betId) => {},
  updateBet: (bet) => {},
  addActive: (bet, dontUpdateTime = false) => {},
  removeActive: (hash) => {},
  updateActive: (bet, dontUpdateTime = false) => {},
  cancelAllBets: () => {},
};

export const BETSLIP_STATE_KEYS = {
  BETS_CHANGED_MESSAGES: "betsChangedMessages",
  SELECTED_VIEW: "selectedView",
  SELECTED_COUNT: "selectedCount",
  BETS: "bets",
  ACTIVE: "active",
};

export const BETSLIP_ACTIONS = {
  SET_BETS_CHANGED_MESSAGES: "SET_BETS_CHANGED_MESSAGES",
  TOGGLE_SELECTED_VIEW: "TOGGLE_SELECTED_VIEW",
  ADD_BET: "ADD_BET",
  REMOVE_BET: "REMOVE_BET",
  UPDATE_BET: "UPDATE_BET",
  ADD_ACTIVE: "ADD_ACTIVE",
  REMOVE_ACTIVE: "REMOVE_ACTIVE",
  UPDATE_ACTIVE: "UPDATE_ACTIVE",
  CANCEL_ALL_BETS: "CANCEL_ALL_BETS",
  CLEAR_BETSLIP: "CLEAR_BETSLIP",
};
