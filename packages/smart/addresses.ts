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
  type: MarketFactoryType;
  address: string;
  collateral: string;
  ammFactory: string;
  description?: string; // for humans to read
  version?: string; // release version. for humans to read
}
export type MarketFactoryType = "SportsLink" | "MMALink" | "Trusted" | "Crypto";
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
        description: "mlb and nba",
        version: "v1.0.0",
        type: "SportsLink",
        address: "0xEFA66e55707C43Db47D43fD65c2Ab4e861e989B6",
        collateral: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        ammFactory: "0x63BBEEa5085E94D1F57A5938f9a22dd485572Bb3",
      },
      {
        description: "mlb and nba",
        version: "v1.0.0-beta.7",
        type: "SportsLink",
        address: "0xd9AD92f448bf89eF1Fe1b2BcF0aBE7221Bb79652",
        collateral: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        ammFactory: "0x38dC258E914834fe1f2393f1dfCedeF69deD5Df4",
      },
    ],
    info: { uploadBlockNumber: 15336699, graphName: "matic" },
  },
  80001: {
    reputationToken: "0x1A921b8a13372Cc81A415d02627756b5418a71c9",
    balancerFactory: "0xE152327f9700F1733d12e7a507045FB4A4606C6F",
    marketFactories: [
      {
        type: "Crypto",
        address: "0xC05CeF624827E0372195E84D2F45235cf058A2F6",
        collateral: "0x5799bFe361BEea69f808328FF4884DF92f1f66f0",
        ammFactory: "0xeC82F887613AFf163949A0b56b7e67222952c92d",
        description: "crypto prices",
        version: "FILL THIS OUT",
      },
      {
        type: "SportsLink",
        address: "0x203fdF154b636D834ABC015Ca6Dc9C6127659c58",
        collateral: "0x5799bFe361BEea69f808328FF4884DF92f1f66f0",
        ammFactory: "0xeC82F887613AFf163949A0b56b7e67222952c92d",
        description: "mlb and nba",
        version: "FILL THIS OUT",
      },
      {
        type: "Crypto",
        address: "0xaB66e733FB24FEFa28c05689D22504044E872b6f",
        collateral: "0x5799bFe361BEea69f808328FF4884DF92f1f66f0",
        ammFactory: "0xeC82F887613AFf163949A0b56b7e67222952c92d",
        description: "crypto prices",
        version: "2021-06-30.1",
      },
      {
        type: "SportsLink",
        address: "0x3ECb867545d4e7E754285f74fB8cbc59Cd8e7f98",
        collateral: "0x5799bFe361BEea69f808328FF4884DF92f1f66f0",
        ammFactory: "0xeC82F887613AFf163949A0b56b7e67222952c92d",
        description: "mlb and nba",
        version: "2021-06-30.1",
      },
      {
        type: "MMALink",
        address: "0x6884938f3488CC020400FFAEFC75C37fb3FEf003",
        collateral: "0x5799bFe361BEea69f808328FF4884DF92f1f66f0",
        ammFactory: "0xeC82F887613AFf163949A0b56b7e67222952c92d",
        description: "mma",
        version: "2021-06-30.0",
      },
    ],
    info: { uploadBlockNumber: 15758544, graphName: "mumbai" },
  },
};
