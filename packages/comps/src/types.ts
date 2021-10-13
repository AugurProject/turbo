import { MouseEvent } from "react";
import type { BigNumber } from "./utils/create-big-number";
import type { TradingDirection } from "./utils/constants";
import { ethers } from "ethers";
import { MarketFactory } from "@augurproject/smart";

export interface TextLink {
  text: string;
  link?: string;
  linkText?: string;
  lighten?: boolean;
}

export interface TextObject {
  title: string;
  subheader: TextLink[];
}

export declare interface Alert {
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
  marketFactories: MarketFactory[];
  info: { uploadBlockNumber: number; graphName: string };
}
export interface AmmTransaction {
  id: string;
  tx_type: string;
  cash: string;
  shares?: string;
  noShares?: string;
  yesShares?: string;
  marketId?: { id: string };
  sender: string;
  timestamp: string;
  txHash: string;
  transactionHash?: string;
  outcome?: string;
  collateral?: string;
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
  payout?: string;
  fees?: string;
  totalSupply?: string;
}

export interface BuySellTransactions {
  collateral: string;
  id: string;
  outcome: string;
  shares: string;
  price: string;
  user: string;
  timestamp: string;
}
export interface AddRemoveLiquidity {
  collateral: string;
  id: string;
  lpTokens: string;
  sender: {
    id: string;
  };
  timestamp: number;
  transactionHash: string;
  outcomes: string[];
  sharesReturned: string[];
}

export interface ClaimWinningsTransactions {
  id: string;
  outcome: string;
  fees: string;
  marketId: string;
  timestamp: string;
  transactionHash: string;
  cash: string;
  receiver: string;
}

export interface ClaimFeesTransactions {
  id: string;
  cash: string;
  timestamp: string;
  transactionHash: string;
  receiver: string;
}
export interface MarketTransactions {
  addLiquidity: AddRemoveLiquidity[];
  removeLiquidity: AddRemoveLiquidity[];
  trades?: BuySellTransactions[];
}
export interface UserMarketTransactions {
  addLiquidity: AddRemoveLiquidity[];
  removeLiquidity: AddRemoveLiquidity[];
  buys: BuySellTransactions[];
  sells: BuySellTransactions[];
}
export interface AllUserMarketTransactions {
  [marketId: string]: UserMarketTransactions;
}
export interface UserClaimTransactions {
  claimedFees: ClaimFeesTransactions[];
  claimedProceeds: ClaimWinningsTransactions[];
  userAddress: string;
}
export interface AllMarketsTransactions {
  [marketId: string]: MarketTransactions;
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

export interface AmmExchange {
  id: string;
  turboId: number;
  marketId: string;
  market: MarketInfo;
  liquidityUSD: number;
  volume24hrTotalUSD?: number;
  volumeTotalUSD?: number;
  feeDecimal: string;
  feeRaw: string;
  feeInPercent: string;
  cash: Cash;
  totalSupply?: string;
  hasLiquidity?: boolean;
  apy?: string;
  ammOutcomes: AmmOutcome[];
  shareFactor: string;
  balancesRaw: string[];
  weights: string[];
  marketFactoryAddress: string;
  ammFactoryAddress: string;
  pools?: AmmExchange[];
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

export interface RewardsInfo {
  beginTimestamp: number;
  created: boolean;
  earlyDepositEndTimestamp: number;
  endTimestamp: number;
  totalRewardsAccrued: string;
  rawTotalRewardsAccrued: string;
}
export interface MarketInfo {
  marketId: string;
  eventId: string;
  sportId?: string;
  sportsMarketType?: number;
  marketFactoryAddress: string;
  turboId: number;
  title: string;
  description?: string;
  endTimestamp: number;
  startTimestamp?: number;
  creationTimestamp: string;
  fee: string;
  settlementFee: string;
  categories: string[];
  outcomes: MarketOutcome[];
  amm: AmmExchange | null;
  reportingState: string;
  isInvalid: boolean;
  numTicks: string;
  hasWinner: boolean;
  winner?: number;
  shareTokens?: string[];
  marketFactoryType?: string;
  coinIndex?: string;
  price?: string;
  spreadOuLine?: number;
  initialOdds: string[];
  isPopular?: boolean;
  isGrouped: boolean;
  subMarkets?: { marketName: string; shareTokens: string[]; marketType: number; factory: string; marketId: number }[];
  category?: string;
  rewards?: RewardsInfo;
  spreadLine?: number;
}

export interface SubOutcome {
  name: string;
  shareToken: string;
}
export interface MarketOutcome {
  id: number;
  isFinalNumerator?: boolean;
  payoutNumerator?: string;
  name: string;
  symbol?: string;
  isInvalid?: boolean;
  isWinner?: boolean;
  subOutcomes?: SubOutcome[];
  marketId?: string;
}

export interface AmmOutcome extends MarketOutcome {
  price: string;
  ratioRaw: string;
  ratio: string;
  balanceRaw: string;
  balance: string;
  marketId?: string;
  shareToken?: string;
}

export interface Cash {
  address: string;
  shareToken?: string;
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

export interface FormattedNumberOptions {
  decimals?: number;
  decimalsRounded?: number;
  denomination?: Function;
  roundUp?: boolean;
  roundDown?: boolean;
  positiveSign?: boolean;
  zeroStyled?: boolean;
  minimized?: boolean;
  blankZero?: boolean;
  bigUnitPostfix?: boolean;
  removeComma?: boolean;
  precisionFullLabel?: boolean;
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

export interface Blockchain {
  currentBlockNumber: number;
  lastSyncedBlockNumber: number;
  blocksBehindCurrent: number;
  percentSynced: string;
  currentAugurTimestamp: number;
}

export interface AppStatus {
  isHelpMenuOpen: boolean;
  ethToDaiRate: FormattedNumber;
  repToDaiRate: FormattedNumber;
  usdcToDaiRate: FormattedNumber;
  usdtToDaiRate: FormattedNumber;
}

export interface UnrealizedRevenue {
  unrealizedRevenue24hChangePercent: string;
}

// TODO: to be provided by SDK the comes from user stats
export interface TimeframeData {
  positions: number;
  numberOfTrades: number;
  marketsTraded: number;
  marketsCreated: number;
  successfulDisputes: number;
  redeemedPositions: number;
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

export interface WindowApp extends Window {
  app?: any;
  web3?: Web3;
  ethereum?: {
    selectedAddress;
    networkVersion: string;
    isMetaMask?: boolean;
    on?: Function;
    enable?: Function;
    send?: Function;
    request?: Function;
    chainId?: string;
  };
  localStorage: Storage;
  integrationHelpers: any;
  fm?: any;
  torus?: any;
  portis?: any;
  stores?: {
    appStatus?: any;
    markets?: any;
    betslip?: any;
    trading?: any;
    pendingOrders?: any;
  };
  data?: any;
  appStatus?: any;
  graphData?: any;
  simplified?: any;
  markets?: any;
  betslip?: any;
  trading?: any;
  user?: any;
  sport?: any;
  pendingOrders?: any;
  showIndexedDbSize?: Function;
}

export type ButtonActionType = (event: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void;

export type NodeStyleCallback = (err: Error | string | null, result?: any) => void;

export type DataCallback = (result?: any) => void;

export interface EthereumWallet {
  appId: string;
  appIds: string[];
  archived: boolean;
  deleted: boolean;
  sortIndex: number;
  id: string;
  type: string;
  keys: { ethereumAddress: string };
}

export interface TradeInfo {
  marketId: string;
  amm: AmmExchange;
  tradeType: TradingDirection;
  buyYesShares: boolean;
  inputDisplayAmount?: string;
  minDisplayAmount?: string;
  estimatedAmount?: string;
  userBalances?: string[];
}

export interface EstimateTradeResult {
  averagePrice: string;
  outputValue: string;
  maxProfit: string;
  tradeFees: string;
  remainingShares?: string;
  ratePerCash: string;
  priceImpact: string;
  outcomeShareTokensIn?: string[];
  maxSellAmount?: string;
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

export interface ActivityData {
  date?: string;
  sortableMonthDay?: number;
  activity?: ActivityItem[];
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
  poolPct?: string;
  marketId?: string;
}

export interface LPTokens {
  [marketId: string]: LPTokenBalance;
}
export interface CurrencyBalance extends SimpleBalance {
  usdValue: string;
}

export interface Winnings {
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
  outcomeName: string;
  outcomeId: number;
  maxUsdValue: string;
  totalChangeUsd: string;
  quantity: string;
  visible: boolean;
  positionFromAddLiquidity: boolean;
  positionFromRemoveLiquidity: boolean;
  timestamp: number;
  marketId: string;
}

export interface AmmMarketShares {
  [marketId: string]: {
    ammExchange: AmmExchange;
    positions: PositionBalance[];
    claimableWinnings?: Winnings;
    outcomeShares: string[];
    outcomeSharesRaw: string[];
  };
}

export interface Approvals {
  [address: string]: boolean;
}

export interface PendingUserReward {
  balance: string;
  rawBalance: string;
  marketId: string;
  endEarlyBonusTimestamp: number;
  endBonusTimestamp: number;
  pendingBonusRewards: string;
  earnedBonus: string;
}
export interface PendingRewards {
  [marketId: string]: PendingUserReward;
}
export interface UserBalances {
  ETH: CurrencyBalance;
  USDC: CurrencyBalance;
  totalAccountValue: string;
  totalPositionUsd: string;
  total24hrPositionUsd: string;
  change24hrPositionUsd: string;
  availableFundsUsd: string;
  totalAccountValueOpenOnly: string;
  totalCurrentLiquidityUsd: string;
  lpTokens: LPTokens;
  marketShares: AmmMarketShares;
  claimableWinnings: PositionWinnings;
  claimableFees: string;
  rep?: string;
  legacyRep?: string;
  approvals?: Approvals;
  pendingRewards?: PendingRewards;
  totalRewards?: string;
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

export interface Modal {
  type?: string;
  cb?: Function;
}

export interface Settings {
  slippage: string;
  showInvalidMarkets: boolean;
  showLiquidMarkets: boolean;
}

export interface SeenPositionWarnings {
  add: boolean;
  remove: boolean;
}

export interface AppStatusState {
  isMobile: boolean;
  isLogged: boolean;
  isRpcDown: boolean;
  isDegraded: boolean;
  isLowRewards: boolean;
  isEmptyRewards: boolean;
  modal: Modal;
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
  loading?: boolean;
  transactions?: any;
}

export interface DataState extends GraphDataState {}

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
  type?: string;
  confirmedTime?: number;
  timestamp?: number;
  seen?: boolean;
  status?: string;
  message?: string;
  marketDescription?: string;
}

export interface LiquidityBreakdown {
  amount?: string;
  minAmountsRaw?: string[];
  minAmounts?: { amount: string; outcomeId?: number; hide?: boolean }[];
  poolPct?: string;
  lpTokens?: string;
  cashAmount?: string;
}

export interface MarketFactoryNames {
  [address: string]: string;
}
