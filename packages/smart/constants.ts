export interface Addresses {
  reputationToken: string;
  balancerFactory: string;
  // Lower index is newer.
  marketFactories: MarketFactory[];
  info: {
    uploadBlockNumber: number;
    graphName?: string; // optional because the graph doesn't support every network
  };
}
export type MarketFactory = {
  type: MarketFactoryType; // matches market factories that share markets
  subtype: MarketFactorySubType; // for determining which ABI to use
  address: string;
  collateral: string;
  ammFactory: string;
  fetcher: string;
  description?: string; // for humans to read
  version?: string; // release version. for humans to read
} & (
  | {
      hasRewards: true;
      masterChef: string;
    }
  | {
      hasRewards: false;
    }
);

export const MARKET_TYPES = [
  "Trusted",
  "Crypto",
  "SportsLink",
  "MMALink",
  "MMA",
  "NBA",
  "MLB",
  "NFL",
  "Futures",
] as const;
export type MarketFactoryType = typeof MARKET_TYPES[number];
// V1 was the first
// V2 includes initial odds
// V3 is after the major refactor
export type MarketFactorySubType = "V1" | "V2" | "V3";
export type MarketFactoryContractName =
  | "SportsLinkMarketFactoryV2"
  | "MMALinkMarketFactoryV2"
  | "NFLMarketFactoryV3"
  | "NBAMarketFactoryV3"
  | "MLBMarketFactoryV3"
  | "MMAMarketFactoryV3"
  | "CryptoMarketFactoryV3"
  | "FuturesMarketFactoryV3"
  | "TrustedMarketFactoryV3";
export type FetcherContractName =
  | "NBAFetcher"
  | "MMAFetcher"
  | "NFLFetcher"
  | "MLBFetcher"
  | "CryptoFetcher"
  | "FuturesFetcher"
  | "";
export const MARKET_FACTORY_TYPE_TO_CONTRACT_NAME: {
  [Property in MarketFactoryType]: MarketFactoryContractName;
} = {
  SportsLink: "SportsLinkMarketFactoryV2",
  MMALink: "MMALinkMarketFactoryV2",
  NFL: "NFLMarketFactoryV3",
  MLB: "MLBMarketFactoryV3",
  NBA: "NBAMarketFactoryV3",
  MMA: "MMAMarketFactoryV3",
  Crypto: "CryptoMarketFactoryV3",
  Futures: "FuturesMarketFactoryV3",
  Trusted: "TrustedMarketFactoryV3",
};
export const marketFactoryTypeToFetcherName: {
  [Property in MarketFactoryType]: FetcherContractName;
} = {
  SportsLink: "",
  MMALink: "",
  MMA: "MMAFetcher",
  NFL: "NFLFetcher",
  MLB: "MLBFetcher",
  NBA: "NBAFetcher",
  Crypto: "CryptoFetcher",
  Futures: "FuturesFetcher",
  Trusted: "",
};
export enum ChainId {
  Mainnet = 1,
  Ropsten = 3,
  Rinkeby = 4,
  Kovan = 42,
  HardHat = 31337,
  ArbitrumKovan4 = 212984383488152,
  MaticMumbai = 80001,
  MaticMainnet = 137,
}
export const graphChainNames: {
  [chainId: number]: string;
} = {
  1: "mainnet",
  3: "ropsten",
  4: "rinkeby",
  42: "kovan",
  80001: "mumbai",
  137: "matic",
};
export type AddressMapping = {
  [id in ChainId]?: Addresses;
};
