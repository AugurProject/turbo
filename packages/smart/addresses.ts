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
  fetcher: string;
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
        fetcher: "",
      },
      {
        description: "mlb and nba",
        version: "v1.0.0-beta.7",
        type: "SportsLink",
        address: "0xd9AD92f448bf89eF1Fe1b2BcF0aBE7221Bb79652",
        collateral: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        ammFactory: "0x38dC258E914834fe1f2393f1dfCedeF69deD5Df4",
        fetcher: "",
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
        fetcher: "",
        description: "crypto prices",
        version: "2021-07-01.0",
      },
      {
        type: "SportsLink",
        address: "0x203fdF154b636D834ABC015Ca6Dc9C6127659c58",
        collateral: "0x5799bFe361BEea69f808328FF4884DF92f1f66f0",
        ammFactory: "0xeC82F887613AFf163949A0b56b7e67222952c92d",
        fetcher: "",
        description: "mlb and nba",
        version: "2021-07-01.0",
      },
      {
        type: "MMALink",
        address: "0x6884938f3488CC020400FFAEFC75C37fb3FEf003",
        collateral: "0x5799bFe361BEea69f808328FF4884DF92f1f66f0",
        ammFactory: "0xeC82F887613AFf163949A0b56b7e67222952c92d",
        fetcher: "",
        description: "mma",
        version: "2021-06-30.0",
      },
      {
        type: "SportsLink",
        address: "0x4225c4fe9A02706C7beC927A3DB25f29E273b3d1",
        collateral: "0x5799bFe361BEea69f808328FF4884DF92f1f66f0",
        ammFactory: "0x43556B27e6Cd1c01Cd0945c5d53077dc1bB05FfD",
        fetcher: "",
        description: "mlb and nba",
        version: "v1.0.0",
      },
      {
        type: "SportsLink",
        address: "0x1ac5742415c071f376C81F6e2A7fE56eA19fb3dF",
        collateral: "0x5799bFe361BEea69f808328FF4884DF92f1f66f0",
        ammFactory: "0x8860542771F787dD8B2c8f9134662751DE2F664f",
        fetcher: "",
        description: "mlb and nba",
        version: "v1.0.0-beta.7",
      },
    ],
    info: { uploadBlockNumber: 15758544, graphName: "mumbai" },
  },
};
