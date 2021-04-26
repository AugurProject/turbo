import { MouseEvent } from "react";
import type { BigNumber } from "bignumber.js";
import { ethers } from "ethers";

export const TransactionTypes = {
  ENTER: "ENTER",
  EXIT: "EXIT",
  ADD_LIQUIDITY: "ADD_LIQUIDITY",
  REMOVE_LIQUIDITY: "REMOVE_LIQUIDITY",
};

export interface TextLink {
  text: string;
  link?: string;
  linkText?: string;
  lighten?: boolean;
}

export interface Alert {
  id: string;
  uniqueId: string;
  toast: boolean;
  title: string;
  name: string;
  description: string;
  timestamp: number;
  href: string;
  action: any;
  status: string;
  seen: boolean;
  level: string;
  params: object;
}

export interface TimezoneDateObject {
  formattedUtc: string;
  formattedLocalShortDateTimeWithTimezone: string;
  timestamp: number;
}

export interface DateFormattedObject {
  clockTimeLocal: string;
  clockTimeUtc: string;
  formattedLocalShortDate: string;
  formattedLocalShortDateSecondary: string;
  formattedLocalShortDateTimeNoTimezone: string;
  formattedLocalShortDateTimeNoSecNoTimezone: string;
  formattedLocalShortDateTimeWithTimezone: string;
  formattedLocalShortWithUtcOffset: string;
  formattedLocalShortWithUtcOffsetWithoutSeconds: string;
  formattedShortTime: string;
  formattedShortUtc: string;
  formattedSimpleData: string;
  formattedUtc: string;
  formattedUtcShortDate: string;
  formattedUtcShortTime: string;
  timestamp: number;
  utcLocalOffset: number;
  value: Date;
}

export interface ValueLabelPair {
  label: string;
  value: string | FormattedNumber;
  useFull?: boolean;
}
export interface CoreStats {
  availableFunds: ValueLabelPair;
  frozenFunds: ValueLabelPair;
  totalFunds: ValueLabelPair;
  realizedPL: ValueLabelPair;
}

export interface ParaDeploys {
  networkId: string;
  collateral: string;
  reputationToken: string;
  balancerFactory: string;
  hatcheryRegistry: string;
  hatchery: string;
  arbiter: string;
  ammFactory: string;
  pool: string;
}
export interface AmmTransaction {
  id: string;
  tx_type: string;
  cash: string;
  noShares: string;
  yesShares: string;
  sender: string;
  timestamp: string;
  tx_hash: string;
  price?: string;
  value: string;
  subheader: string;
  date: string;
  time: string;
  currency: string;
  shareAmount: string;
  tokenAmount: string;
  cashValueUsd?: string;
  lpTokens?: string;
  yesShareCashValue?: string;
  noShareCashValue?: string;
  cashValue?: string; // for add/remove liquidity
  netShares?: string; // only for add liquidity
}

export interface Trade {
  price: number;
  timestamp: number;
  shares: string;
}
export interface Trades {
  [outcomeIdx: number]: Trade[];
}

export interface AmmExchangeOutcome {
  id: number;
  price: string;
  name: string;
}

export interface InvalidPool {
  id: string;
  cashBalance: string;
  cashWeight: string;
  invalidBalance: string;
  invalidWeight: string;
  swapFee: string;
}
export interface AmmExchange {
  id: string;
  marketId: string;
  market: MarketInfo;
  liquidity: string;
  liquidityUSD: number;
  liquidity24hrUSD: string;
  liquidityNo: string;
  liquidityYes: string;
  liquidityInvalid: string;
  priceYes: string;
  priceNo: string;
  percentageYes: string;
  percentageNo: string;
  volumeYes: string;
  volumeNo: string;
  volumeYesUSD: string;
  volumeNoUSD: string;
  volume24hrTotalUSD: number;
  volumeTotal: string;
  volumeTotalUSD: number;
  feeDecimal: string;
  feeRaw: string;
  feeInPercent: string;
  cash: Cash;
  sharetoken: string;
  transactions: AmmTransaction[];
  trades: Trades;
  past24hrPriceNo?: string;
  past24hrPriceYes?: string;
  totalSupply?: string;
  apy?: string;
  ammOutcomes: AmmOutcome[];
  isAmmMarketInvalid: boolean;
  invalidPool: InvalidPool;
  symbols: string[];
  swapInvalidForCashInETH?: string;
}

export interface Cashes {
  [address: string]: Cash;
}

export interface ClaimedProceeds {
  id: string;
  shareToken: string;
  user: string;
  outcome: number;
  winnings: string;
  rawSharesClaimed: string;
  fees: string;
  timestamp: number;
  cash: Cash;
}
export interface MarketInfo {
  marketId: string;
  eventId: string;
  description: string;
  endTimestamp: number;
  creationTimestamp: string;
  extraInfoRaw: string;
  longDescription: string;
  fee: string;
  numTicks: string;
  reportingFee: string;
  settlementFee: string;
  categories: string[];
  outcomes: MarketOutcome[];
  amm: AmmExchange | null;
  reportingState: string;
  claimedProceeds: ClaimedProceeds[];
  isInvalid: boolean;
  hasWinner?: boolean;
  winner?: number;
  title?: string;
  startTimestamp?: number;
}

export interface MarketOutcome {
  id: number;
  isFinalNumerator?: boolean;
  payoutNumerator?: string;
  shareToken: string;
  name: string;
  isInvalid: boolean;
  isWinner: boolean;
}

export interface AmmOutcome {
  id: number;
  name: string;
  price: string;
  isInvalid?: boolean;
}

export interface Cash {
  address: string;
  shareToken: string;
  name: string;
  symbol: string;
  asset: string;
  decimals: number;
  usdPrice?: string;
  displayDecimals: number;
}
export interface AmmExchanges {
  [id: string]: AmmExchange;
}
export interface MarketInfos {
  [marketId: string]: MarketInfo;
}

export interface FormattedNumber {
  fullPrecision: number | string;
  roundedValue: number | string;
  roundedFormatted: string;
  formatted: string;
  formattedValue: number | string;
  denomination: string;
  minimized: string;
  value: number;
  rounded: number | string;
  full: string;
  percent: number | string;
}

export interface Endpoints {
  ethereumNodeHTTP: string;
  ethereumNodeWS: string;
}

export interface Category {
  categoryName: string;
  nonFinalizedOpenInterest: string;
  openInterest: string;
  tags: Array<string>;
}

export interface AppStatus {
  isHelpMenuOpen: boolean;
  ethToDaiRate: FormattedNumber;
  repToDaiRate: FormattedNumber;
  usdcToDaiRate: FormattedNumber;
  usdtToDaiRate: FormattedNumber;
}

export interface LoginAccountMeta {
  accountType: string;
  address: string;
  signer: any;
  provider: ethers.providers.JsonRpcProvider;
  isWeb3: boolean;
  profileImage?: string;
  email?: string;
  openWallet?: Function;
}

export interface LoginAccountSettings {
  showInvalidMarketsBannerFeesOrLiquiditySpread?: boolean;
  showInvalidMarketsBannerHideOrShow?: boolean;
  templateFilter?: string;
  maxFee?: string;
  includeInvalidMarkets?: string;
  spread?: boolean;
  marketTypeFilter?: boolean;
  marketFilter?: string;
  showInvalid?: boolean;
  sortBy?: string;
  limit?: number;
  offset?: number;
}

export interface LoginAccount {
  account?: string;
  mixedCaseAddress?: string;
  meta?: LoginAccountMeta;
  settings?: LoginAccountSettings;
  active: boolean;
  chainId: number;
  library?: any; //Web3Provider;
  activate?: () => {};
  connector?: any; // AbstractConnector, InjectedConnector for Metamask
  error?: string;
  deactivate?: () => {};
}

export interface Web3 {
  currentProvider: any;
}

export type ButtonActionType = (event: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void;

export type DataCallback = (result?: any) => void;

export enum TradingDirection {
  ENTRY = "ENTRY",
  EXIT = "EXIT",
}

export interface EstimateTradeResult {
  averagePrice: string;
  outputValue: string;
  maxProfit: string;
  tradeFees: string;
  remainingShares?: string;
  slippagePercent: string;
  ratePerCash: string;
}

export interface PriceTimeSeriesData {
  tokenVolume: number;
  period: number;
  open: number;
  close: number;
  low: number;
  high: number;
  volume: number;
  shareVolume: number;
}

export interface MarketClaimablePositions {
  markets: MarketInfo[];
  totals: {
    totalUnclaimedProfit: BigNumber;
    totalUnclaimedProceeds: BigNumber;
    totalFees: BigNumber;
  };
  positions: {
    [marketId: string]: {
      unclaimedProfit: string;
      unclaimedProceeds: string;
      fee: string;
    };
  };
}

export interface ActivityItem {
  id: string;
  type: string;
  currency: string;
  description: string;
  subheader: string;
  time: string;
  value: string;
  txHash: string;
  timestamp: number;
}

export interface SimpleBalance {
  balance: string;
  rawBalance: string;
}

export interface LPTokenBalance extends SimpleBalance {
  initCostUsd?: string;
  usdValue?: string;
}

export interface LPTokens {
  [ammId: string]: LPTokenBalance;
}

export interface CurrencyBalance extends SimpleBalance {
  usdValue: string;
}

export interface Winnings {
  sharetoken: string;
  claimableBalance: string;
  userBalances: string[];
}

export interface PositionWinnings {
  [ammId: string]: Winnings;
}

export interface PositionBalance extends SimpleBalance {
  usdValue: string;
  past24hrUsdValue?: string;
  change24hrPositionUsd: string;
  avgPrice: string;
  initCostUsd: string;
  initCostCash: string;
  outcomeName: string;
  outcomeId: number;
  maxUsdValue: string;
  totalChangeUsd: string;
  quantity: string;
  visible: boolean;
  positionFromLiquidity: boolean;
  positionFromRemoveLiquidity: boolean;
}

export interface AmmMarketShares {
  [ammId: string]: {
    ammExchange: AmmExchange;
    positions: PositionBalance[];
    claimableWinnings?: Winnings;
    outcomeShares: string[];
    outcomeSharesRaw: string[];
  };
}

export interface UserBalances {
  ETH: CurrencyBalance;
  USDC: CurrencyBalance;
  totalAccountValue: string;
  totalPositionUsd: string;
  total24hrPositionUsd: string;
  change24hrPositionUsd: string;
  availableFundsUsd: string;
  lpTokens: LPTokens;
  marketShares: AmmMarketShares;
  claimableWinnings: PositionWinnings;
}

export interface ProcessedData {
  markets: {
    [marketIdKey: string]: MarketInfo;
  };
  cashes: {
    [address: string]: Cash;
  };
  ammExchanges: {
    [id: string]: AmmExchange;
  };
  errors?: any;
}

interface Modal {
  type?: string;
}

export interface Settings {
  slippage: string;
  showLiquidMarkets: boolean;
}

export interface SeenPositionWarnings {
  add: boolean;
  remove: boolean;
}

export interface AppStatusState {
  marketsViewSettings: {
    categories: string;
    reportingState: string;
    sortBy: string;
    currency: string;
  };
  isMobile: boolean;
  isLogged: boolean;
  showTradingForm: boolean;
  sidebarType: string;
  modal: Modal;
  settings: Settings;
}

export interface GraphDataState {
  ammExchanges: {
    [id: string]: AmmExchange;
  };
  blocknumber: number;
  cashes: {
    [address: string]: Cash;
  };
  errors?: any;
  markets: {
    [marketIdKey: string]: MarketInfo;
  };
}

export interface UserState {
  account: string;
  balances: UserBalances;
  loginAccount: LoginAccount;
  seenPositionWarnings: {
    [id: string]: SeenPositionWarnings;
  };
  transactions: TransactionDetails[];
}

export interface TransactionDetails {
  chainId: string;
  hash: string;
  from: string;
  approval?: { tokenAddress: string; spender: string };
  claim?: { recipient: string };
  receipt?: any;
  lastCheckedBlockNumber?: number;
  addedTime: number;
  confirmedTime?: number;
  timestamp?: number;
  seen?: boolean;
  status?: string;
  marketDescription?: string;
}

export interface LiquidityBreakdown {
  yesShares: string;
  noShares: string;
  lpTokens?: string;
  cashAmount?: string;
  minAmounts: string[];
}
