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
export const MARKET_TYPES = ["Trusted", "Crypto", "SportsLink", "MMA", "NBA", "MLB", "NFL"] as const;
export type MarketFactoryType = typeof MARKET_TYPES[number];
export type MarketFactorySubType = "V1" | "V2";
export type MarketFactoryContractName =
  | "SportsLinkMarketFactoryV2"
  | "NFLMarketFactory"
  | "NBAMarketFactory"
  | "MLBMarketFactory"
  | "MMAMarketFactory"
  | "CryptoMarketFactory"
  | "TrustedMarketFactory";
export type FetcherContractName = "NBAFetcher" | "MMAFetcher" | "NFLFetcher" | "MLBFetcher" | "";
export const MARKET_FACTORY_TYPE_TO_CONTRACT_NAME: {
  [Property in MarketFactoryType]: MarketFactoryContractName;
} = {
  SportsLink: "SportsLinkMarketFactoryV2",
  NFL: "NFLMarketFactory",
  MLB: "MLBMarketFactory",
  NBA: "NBAMarketFactory",
  MMA: "MMAMarketFactory",
  Crypto: "CryptoMarketFactory",
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
        subtype: "V2",
        address: "0xA76C803c1D3B4cc31b1B964f29357BbF23B6D6f7",
        collateral: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        ammFactory: "0xF515d928c9dC700969723a41038eDF34ecEf2240",
        fetcher: "0x1F26275cf999B33Eb39f304E622adbe0C5214Cbf",
        description: "mlb and nba",
        version: "v1.1.0",
      },
      {
        type: "MMA",
        subtype: "V2",
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
        type: "MLB",
        subtype: "V2",
        address: "0xc28Ed86Ba56bB7396Cf16bb9c095C58dFE0524F0",
        collateral: "0x5799bFe361BEea69f808328FF4884DF92f1f66f0",
        ammFactory: "0xEC83b3a1f0c8b61ed1E6c92509Cd5a672771D2Dd",
        fetcher: "0xb70F0B373C3222ca9d9a5e0Dcdf2875221352C6A",
        description: "mlb",
        version: "refactor",
      },
      {
        type: "NBA",
        subtype: "V2",
        address: "0xa7309Bdb5a634c8D2d1768092c43cF70ff5799e2",
        collateral: "0x5799bFe361BEea69f808328FF4884DF92f1f66f0",
        ammFactory: "0xEC83b3a1f0c8b61ed1E6c92509Cd5a672771D2Dd",
        fetcher: "0xb70F0B373C3222ca9d9a5e0Dcdf2875221352C6A",
        description: "nba",
        version: "refactor",
      },
      {
        type: "NFL",
        subtype: "V2",
        address: "0xCd67d18a66737F1Db26C4A74732562B599217b2F",
        collateral: "0x5799bFe361BEea69f808328FF4884DF92f1f66f0",
        ammFactory: "0xEC83b3a1f0c8b61ed1E6c92509Cd5a672771D2Dd",
        fetcher: "0xb70F0B373C3222ca9d9a5e0Dcdf2875221352C6A",
        description: "nfl",
        version: "refactor",
      },
      {
        type: "MMA",
        subtype: "V2",
        address: "0x259175Ced1776879F03964c8F29FE3eaF699Ec51",
        collateral: "0x5799bFe361BEea69f808328FF4884DF92f1f66f0",
        ammFactory: "0xEC83b3a1f0c8b61ed1E6c92509Cd5a672771D2Dd",
        fetcher: "0xb70F0B373C3222ca9d9a5e0Dcdf2875221352C6A",
        description: "mma/ufc",
        version: "refactor",
      },
      {
        type: "Crypto",
        subtype: "V2",
        address: "0xd2DfFD1a74b8Ec9350B3138BB8b14fC5819c0544",
        collateral: "0x5799bFe361BEea69f808328FF4884DF92f1f66f0",
        ammFactory: "0xEC83b3a1f0c8b61ed1E6c92509Cd5a672771D2Dd",
        fetcher: "",
        description: "crypto prices",
        version: "refactor",
      },
    ],
    info: { uploadBlockNumber: 15336699, graphName: "mumbai" },
  },
};
