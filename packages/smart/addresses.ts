// This file is updated by deployer.
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
export interface MarketFactory {
  type: MarketFactoryType; // matches market factories that share markets
  subtype: MarketFactorySubType; // for determining which ABI to use
  address: string;
  collateral: string;
  ammFactory: string;
  fetcher: string;
  description?: string; // for humans to read
  version?: string; // release version. for humans to read
}
export const MARKET_TYPES = [
  "Trusted",
  "Crypto",
  "SportsLink",
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
  | "NFLMarketFactory"
  | "NBAMarketFactory"
  | "MLBMarketFactory"
  | "MMAMarketFactory"
  | "CryptoMarketFactory"
  | "FuturesMarketFactory"
  | "TrustedMarketFactory";
export type FetcherContractName =
  | "NBAFetcher"
  | "MMAFetcher"
  | "NFLFetcher"
  | "MLBFetcher"
  | "";
export const MARKET_FACTORY_TYPE_TO_CONTRACT_NAME: {
  [Property in MarketFactoryType]: MarketFactoryContractName;
} = {
  SportsLink: "SportsLinkMarketFactoryV2",
  NFL: "NFLMarketFactory",
  MLB: "MLBMarketFactory",
  NBA: "NBAMarketFactory",
  MMA: "MMAMarketFactory",
  Crypto: "CryptoMarketFactory",
  Futures: "FuturesMarketFactory",
  Trusted: "TrustedMarketFactory",
};
export const marketFactoryTypeToFetcherName: {
  [Property in MarketFactoryType]: FetcherContractName;
} = {
  SportsLink: "",
  MMA: "MMAFetcher",
  NFL: "NFLFetcher",
  MLB: "MLBFetcher",
  NBA: "NBAFetcher",
  Crypto: "",
  Futures: "",
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
type AddressMapping = {
  [id in ChainId]?: Addresses;
};
export const addresses: AddressMapping = {
  137: {
    reputationToken: "0x435C88888388D73BD97dab3B3EE1773B084E0cdd",
    balancerFactory: "0x3eC09e2A4699951179B61c03434636746aBE61AA",
    marketFactories: [
      {
        type: "SportsLink",
        subtype: "V3",
        address: "0xA76C803c1D3B4cc31b1B964f29357BbF23B6D6f7",
        collateral: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        ammFactory: "0xF515d928c9dC700969723a41038eDF34ecEf2240",
        fetcher: "0x1F26275cf999B33Eb39f304E622adbe0C5214Cbf",
        description: "mlb and nba",
        version: "v1.1.0",
      },
      {
        type: "MMA",
        subtype: "V3",
        address: "0xe296e39b44911a7fd4C741daa4eFDd345bF5a076",
        collateral: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        ammFactory: "0xF515d928c9dC700969723a41038eDF34ecEf2240",
        fetcher: "0xAE9df5bf273bfF861174194ca190e99e95a15a26",
        description: "mma",
        version: "v1.1.0",
      },
      {
        type: "SportsLink",
        subtype: "V1",
        address: "0xEFA66e55707C43Db47D43fD65c2Ab4e861e989B6",
        collateral: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        ammFactory: "0x63BBEEa5085E94D1F57A5938f9a22dd485572Bb3",
        fetcher: "",
        description: "mlb and nba",
        version: "v1.0.0",
      },
    ],
    info: { uploadBlockNumber: 15336699, graphName: "matic" },
  },
  80001: {
    reputationToken: "0x1A921b8a13372Cc81A415d02627756b5418a71c9",
    balancerFactory: "0xE152327f9700F1733d12e7a507045FB4A4606C6F",
    marketFactories: [
      {
        type: "Futures",
        subtype: "V3",
        address: "0xAB3a1F44CaD7Ff730F737d4014feDbd339a0381E",
        collateral: "0x5799bFe361BEea69f808328FF4884DF92f1f66f0",
        ammFactory: "0xEC83b3a1f0c8b61ed1E6c92509Cd5a672771D2Dd",
        fetcher: "",
        description: "futures",
        version: "refactor-2021.08.19",
      },
      {
        type: "MLB",
        subtype: "V3",
        address: "0x29F0614f39Af492FFC2624A5fa9eBb9cff4f7778",
        collateral: "0x5799bFe361BEea69f808328FF4884DF92f1f66f0",
        ammFactory: "0xEC83b3a1f0c8b61ed1E6c92509Cd5a672771D2Dd",
        fetcher: "0xb7351Ef0FAd67e7D79F791158A819cb071a2bAC4",
        description: "mlb",
        version: "refactor-2021.08.19",
      },
      {
        type: "NBA",
        subtype: "V3",
        address: "0x181F843c1CBB73a99301827d8F076e6beF943625",
        collateral: "0x5799bFe361BEea69f808328FF4884DF92f1f66f0",
        ammFactory: "0xEC83b3a1f0c8b61ed1E6c92509Cd5a672771D2Dd",
        fetcher: "0xb7351Ef0FAd67e7D79F791158A819cb071a2bAC4",
        description: "nba",
        version: "refactor-2021.08.19",
      },
      {
        type: "NFL",
        subtype: "V3",
        address: "0x48cb89F115A7c256a3520AAd4c9b5fA2841614C4",
        collateral: "0x5799bFe361BEea69f808328FF4884DF92f1f66f0",
        ammFactory: "0xEC83b3a1f0c8b61ed1E6c92509Cd5a672771D2Dd",
        fetcher: "0xb7351Ef0FAd67e7D79F791158A819cb071a2bAC4",
        description: "nfl",
        version: "refactor-2021.08.19",
      },
      {
        type: "MMA",
        subtype: "V3",
        address: "0x0045FC078bb60510185CBA39f2eA352C92C0c179",
        collateral: "0x5799bFe361BEea69f808328FF4884DF92f1f66f0",
        ammFactory: "0xEC83b3a1f0c8b61ed1E6c92509Cd5a672771D2Dd",
        fetcher: "0xb7351Ef0FAd67e7D79F791158A819cb071a2bAC4",
        description: "mma/ufc",
        version: "refactor-2021.08.19",
      },
      {
        type: "Crypto",
        subtype: "V3",
        address: "0x9894aC8e14b44b81B08d5d84CFE5b93B8114F25b",
        collateral: "0x5799bFe361BEea69f808328FF4884DF92f1f66f0",
        ammFactory: "0xEC83b3a1f0c8b61ed1E6c92509Cd5a672771D2Dd",
        fetcher: "",
        description: "crypto prices",
        version: "refactor-2021.08.19",
      },
    ],
    info: { uploadBlockNumber: 15336699, graphName: "mumbai" },
  },
};
