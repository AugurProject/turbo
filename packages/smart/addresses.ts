// This file is updated by deployer.
export interface Addresses {
  reputationToken: string;
  balancerFactory: string;
  marketFactories: MarketFactories;
  ammFactory: string;
  info: {
    uploadBlockNumber: number;
    graphName?: string; // optional because the graph doesn't support every network
  };
}
export type MarketFactories = {
  [name: string]: MarketFactory;
};
export interface MarketFactory {
  type: MarketFactoryType;
  address: string;
  collateral: string;
}
export type MarketFactoryType = "SportsLink" | "Trusted" | "Price";
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
  80001: {
    reputationToken: "0xD4fB02358d9694539eeD446E6531b1fFbA9b6931",
    balancerFactory: "0xE152327f9700F1733d12e7a507045FB4A4606C6F",
    ammFactory: "0x8860542771F787dD8B2c8f9134662751DE2F664f",
    marketFactories: {
      sportsball: {
        type: "SportsLink",
        address: "0xBC8C695dd045FBfe81C353Fd88E3bedE45C2855D",
        collateral: "0x5799bFe361BEea69f808328FF4884DF92f1f66f0",
      },
    },
    info: { uploadBlockNumber: 13994149, graphName: "mumbai" },
  },
  137: {
    reputationToken: "0x435C88888388D73BD97dab3B3EE1773B084E0cdd",
    balancerFactory: "0x3eC09e2A4699951179B61c03434636746aBE61AA",
    ammFactory: "0x38dC258E914834fe1f2393f1dfCedeF69deD5Df4",
    marketFactories: {
      sportsball: {
        type: "SportsLink",
        address: "0x6b53958e2961A30E3Ebbdb6AD03AA7ae88A3C79d",
        collateral: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
      },
    },
    info: { uploadBlockNumber: 14853228, graphName: "matic" },
  },
};
