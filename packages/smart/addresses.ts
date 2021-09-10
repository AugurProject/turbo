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
  hasRewards: boolean;
}
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
type AddressMapping = {
  [id in ChainId]?: Addresses;
};
export const addresses: AddressMapping = {
  137: {
    reputationToken: "0x435C88888388D73BD97dab3B3EE1773B084E0cdd",
    balancerFactory: "0x3eC09e2A4699951179B61c03434636746aBE61AA",
    marketFactories: [
      {
        type: "MMA",
        subtype: "V3",
        address: "0xdCabBAE1c5885134f42F05e60D67f6794f091732",
        collateral: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        ammFactory: "0xF515d928c9dC700969723a41038eDF34ecEf2240",
        fetcher: "0xaDC46f6b0bB03cC229Be56AFF70a8A4E012D812D",
        description: "mma/ufc",
        version: "v1.2.0",
        hasRewards: false,
      },
      {
        type: "NFL",
        subtype: "V3",
        address: "0xBDCE355234dd9d2CCE0912D6132F5Db70bC40287",
        collateral: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        ammFactory: "0xF515d928c9dC700969723a41038eDF34ecEf2240",
        fetcher: "0xaDC46f6b0bB03cC229Be56AFF70a8A4E012D812D",
        description: "nfl",
        version: "v1.2.0",
        hasRewards: false,
      },
      {
        type: "Crypto",
        subtype: "V3",
        address: "0x300d2D67ecB24E63f1bC2fAC4Bc0F314607aDDE5",
        collateral: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        ammFactory: "0xF515d928c9dC700969723a41038eDF34ecEf2240",
        fetcher: "0x96a6e9E91BDb0114C41bB9A389eD20F7FEcDCA03",
        description: "crypto prices",
        version: "v1.2.0",
        hasRewards: false,
      },
      {
        type: "SportsLink",
        subtype: "V2",
        address: "0xA76C803c1D3B4cc31b1B964f29357BbF23B6D6f7",
        collateral: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        ammFactory: "0xF515d928c9dC700969723a41038eDF34ecEf2240",
        fetcher: "0x1F26275cf999B33Eb39f304E622adbe0C5214Cbf",
        description: "mlb and nba",
        version: "v1.1.0",
        hasRewards: false,
      },
      {
        type: "MMALink",
        subtype: "V2",
        address: "0xe296e39b44911a7fd4C741daa4eFDd345bF5a076",
        collateral: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        ammFactory: "0xF515d928c9dC700969723a41038eDF34ecEf2240",
        fetcher: "0xAE9df5bf273bfF861174194ca190e99e95a15a26",
        description: "mma",
        version: "v1.1.0",
        hasRewards: false,
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
        hasRewards: false,
      },
      {
        type: "Crypto",
        subtype: "V2",
        address: "0x8105DFaDBE4a09f52EbF98eB68e31a33C898Fc74",
        collateral: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        ammFactory: "0xF515d928c9dC700969723a41038eDF34ecEf2240",
        fetcher: "",
        description: "crypto prices",
        version: "v1.1.0",
        hasRewards: false,
      },
    ],
    info: { uploadBlockNumber: 15336699, graphName: "matic" },
  },
  31337: {
    reputationToken: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    balancerFactory: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    marketFactories: [
      {
        type: "Futures",
        subtype: "V3",
        address: "0xE6E340D132b5f46d1e472DebcD681B2aBc16e57E",
        collateral: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        ammFactory: "0x9E545E3C0baAB3E08CdfD552C960A1050f373042",
        fetcher: "0xc3e53F4d16Ae77Db1c982e75a937B9f60FE63690",
        hasRewards: true,
        description: "futures",
        version: "FILL THIS OUT",
      },
      {
        type: "Crypto",
        subtype: "V3",
        address: "0x4ed7c70F96B99c776995fB64377f0d4aB3B0e1C1",
        collateral: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        ammFactory: "0x9E545E3C0baAB3E08CdfD552C960A1050f373042",
        fetcher: "0x322813Fd9A801c5507c9de605d63CEA4f2CE6c44",
        hasRewards: true,
        description: "crypto prices",
        version: "FILL THIS OUT",
      },
      {
        type: "Futures",
        subtype: "V3",
        address: "0x67d269191c92Caf3cD7723F116c85e6E9bf55933",
        collateral: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        ammFactory: "0xc3e53F4d16Ae77Db1c982e75a937B9f60FE63690",
        fetcher: "0xE6E340D132b5f46d1e472DebcD681B2aBc16e57E",
        hasRewards: false,
        description: "futures",
        version: "FILL THIS OUT",
      },
      {
        type: "NBA",
        subtype: "V3",
        address: "0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1",
        collateral: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        ammFactory: "0xc3e53F4d16Ae77Db1c982e75a937B9f60FE63690",
        fetcher: "0xc6e7DF5E7b4f2A278906862b61205850344D4e7d",
        hasRewards: false,
        description: "nba",
        version: "FILL THIS OUT",
      },
      {
        type: "MMA",
        subtype: "V3",
        address: "0x68B1D87F95878fE05B998F19b66F4baba5De1aed",
        collateral: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        ammFactory: "0xc3e53F4d16Ae77Db1c982e75a937B9f60FE63690",
        fetcher: "0xc6e7DF5E7b4f2A278906862b61205850344D4e7d",
        hasRewards: false,
        description: "mma/ufc",
        version: "FILL THIS OUT",
      },
      {
        type: "Crypto",
        subtype: "V3",
        address: "0x59b670e9fA9D0A427751Af201D676719a970857b",
        collateral: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        ammFactory: "0xc3e53F4d16Ae77Db1c982e75a937B9f60FE63690",
        fetcher: "0x4ed7c70F96B99c776995fB64377f0d4aB3B0e1C1",
        hasRewards: false,
        description: "crypto prices",
        version: "FILL THIS OUT",
      },
      {
        type: "Futures",
        subtype: "V3",
        address: "0xc3e53F4d16Ae77Db1c982e75a937B9f60FE63690",
        collateral: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
        ammFactory: "0x9E545E3C0baAB3E08CdfD552C960A1050f373042",
        fetcher: "0x84eA74d481Ee0A5332c457a4d796187F6Ba67fEB",
        hasRewards: false,
        description: "futures",
        version: "FILL THIS OUT",
      },
      {
        type: "MMA",
        subtype: "V3",
        address: "0xc6e7DF5E7b4f2A278906862b61205850344D4e7d",
        collateral: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
        ammFactory: "0x9E545E3C0baAB3E08CdfD552C960A1050f373042",
        fetcher: "0x4ed7c70F96B99c776995fB64377f0d4aB3B0e1C1",
        hasRewards: false,
        description: "mma/ufc",
        version: "FILL THIS OUT",
      },
      {
        type: "Crypto",
        subtype: "V3",
        address: "0x322813Fd9A801c5507c9de605d63CEA4f2CE6c44",
        collateral: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
        ammFactory: "0x9E545E3C0baAB3E08CdfD552C960A1050f373042",
        fetcher: "0xa85233C63b9Ee964Add6F2cffe00Fd84eb32338f",
        hasRewards: false,
        description: "crypto prices",
        version: "FILL THIS OUT",
      },
      {
        type: "MLB",
        subtype: "V3",
        address: "0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE",
        collateral: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        ammFactory: "0xc3e53F4d16Ae77Db1c982e75a937B9f60FE63690",
        fetcher: "0xc6e7DF5E7b4f2A278906862b61205850344D4e7d",
        hasRewards: false,
        description: "mlb",
        version: "FILL THIS OUT",
      },
      {
        type: "NFL",
        subtype: "V3",
        address: "0x3Aa5ebB10DC797CAC828524e59A333d0A371443c",
        collateral: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        ammFactory: "0xc3e53F4d16Ae77Db1c982e75a937B9f60FE63690",
        fetcher: "0xc6e7DF5E7b4f2A278906862b61205850344D4e7d",
        hasRewards: false,
        description: "nfl",
        version: "FILL THIS OUT",
      },
    ],
    info: { uploadBlockNumber: 1, graphName: "" },
  },
  80001: {
    reputationToken: "0x1A921b8a13372Cc81A415d02627756b5418a71c9",
    balancerFactory: "0xE152327f9700F1733d12e7a507045FB4A4606C6F",
    marketFactories: [
      {
        type: "MLB",
        subtype: "V3",
        address: "0xB4F6EFd8aD6ad409b032B44F12F7a9caA6B9286A",
        collateral: "0x5799bFe361BEea69f808328FF4884DF92f1f66f0",
        ammFactory: "0x3eaB11C23b6Df47BE57576D9bB929aeCF54CF5Ee",
        fetcher: "0x5a556A55E23678f1700Dd22A2f05aa0BF9313534",
        hasRewards: true,
        description: "mlb",
        version: "renaming-2021-09-08",
      },
      {
        type: "NBA",
        subtype: "V3",
        address: "0x05650996B3Fc9453647885c69ca346A076d1FfAb",
        collateral: "0x5799bFe361BEea69f808328FF4884DF92f1f66f0",
        ammFactory: "0x3eaB11C23b6Df47BE57576D9bB929aeCF54CF5Ee",
        fetcher: "0x5a556A55E23678f1700Dd22A2f05aa0BF9313534",
        hasRewards: true,
        description: "nba",
        version: "renaming-2021-09-08",
      },
      {
        type: "NFL",
        subtype: "V3",
        address: "0xe189c2B90DEa3bbE8A6ff88074299e87f18B7bDD",
        collateral: "0x5799bFe361BEea69f808328FF4884DF92f1f66f0",
        ammFactory: "0x3eaB11C23b6Df47BE57576D9bB929aeCF54CF5Ee",
        fetcher: "0x5a556A55E23678f1700Dd22A2f05aa0BF9313534",
        hasRewards: true,
        description: "nfl",
        version: "renaming-2021-09-08",
      },
      {
        type: "MMA",
        subtype: "V3",
        address: "0x47089a6dC1A323c40ee994364e4BdBE56F785A93",
        collateral: "0x5799bFe361BEea69f808328FF4884DF92f1f66f0",
        ammFactory: "0x3eaB11C23b6Df47BE57576D9bB929aeCF54CF5Ee",
        fetcher: "0x5a556A55E23678f1700Dd22A2f05aa0BF9313534",
        hasRewards: true,
        description: "mma/ufc",
        version: "renaming-2021-09-08",
      },
      {
        type: "Crypto",
        subtype: "V3",
        address: "0x5d8F5B15bdf31F8c965deB092163c323fAf77f31",
        collateral: "0x5799bFe361BEea69f808328FF4884DF92f1f66f0",
        ammFactory: "0x3eaB11C23b6Df47BE57576D9bB929aeCF54CF5Ee",
        fetcher: "0xA4D14c8Dd61376A3b2E3B2057880E14a6457CC7a",
        hasRewards: true,
        description: "crypto prices",
        version: "renaming-2021-09-08",
      },
      {
<<<<<<< HEAD
        type: "SportsLink",
        subtype: "V1",
        address: "0xEFA66e55707C43Db47D43fD65c2Ab4e861e989B6",
        collateral: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        ammFactory: "0x63BBEEa5085E94D1F57A5938f9a22dd485572Bb3",
        fetcher: "",
        description: "mlb and nba",
        version: "v1.0.0",
      }
=======
        type: "Futures",
        subtype: "V3",
        address: "0xe540531CFF46b3e4F20aF5E5973C281E35151fe8",
        collateral: "0x5799bFe361BEea69f808328FF4884DF92f1f66f0",
        ammFactory: "0x50a9c0201699129A69f0736f65F513BdDBc721CC",
        fetcher: "0xB4953e19947cB9F65DFb261fB7C7cCAAF92Cad9b",
        hasRewards: true,
        description: "futures",
        version: "renaming-2021-09-08",
      },
      {
        type: "Crypto",
        subtype: "V3",
        address: "0x4E715BE329A29398A21e8df1D12f501d6FdcFCd7",
        collateral: "0x5799bFe361BEea69f808328FF4884DF92f1f66f0",
        ammFactory: "0x50a9c0201699129A69f0736f65F513BdDBc721CC",
        fetcher: "0x655B9ed5eb28eDCdd537EA76B5eaFe66f3115c38",
        hasRewards: true,
        description: "crypto prices",
        version: "renaming-2021-09-08",
      },
>>>>>>> a2aea16a5c2ca001189fd8ea078b91c834937f6a
    ],
    info: { uploadBlockNumber: 15336699, graphName: "mumbai" },
  },
};
