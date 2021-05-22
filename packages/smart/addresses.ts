// This file is updated by deployer.
export interface Addresses {
  reputationToken: string;
  balancerFactory: string;
  marketFactories: MarketFactories;
  ammFactory: string;
  sportsLinkProxy: string;
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
        address: "0x43D9f2d22f1306D012251d032a5B67553FE4aA82",
        collateral: "0x5799bFe361BEea69f808328FF4884DF92f1f66f0",
      },
    },
    sportsLinkProxy: "0x85F64F63eD841e111C6Ec31B7DB4821Bf0E633d7",
    info: { uploadBlockNumber: 13994149, graphName: "mumbai" },
  },
  137: {
    reputationToken: "0xae8aa4252B7DB37935C4d16E3b2A9F3c46d9749d",
    balancerFactory: "0xafeBD08B1A4473e56e9a17d6F4B060929f29CCA2",
    ammFactory: "0x0b7e490D6cF3BE96830273FD2BcDcE69659bbC41",
    marketFactories: {
      sportsball: {
        type: "SportsLink",
        address: "0xD5a3A8B14B50D529B3C159bAeB36F1382011E923",
        collateral: "0xe0e14c219965105a7065e88317772c2D5758C120",
      },
    },
    sportsLinkProxy: "0x064886d5933593C2C7AF449403635C696A43cD87",
    info: { uploadBlockNumber: 14500254, graphName: "matic" },
  },
  31337: {
    reputationToken: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    balancerFactory: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    ammFactory: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
    marketFactories: {
      sportsball: {
        type: "SportsLink",
        address: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
        collateral: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      },
    },
    sportsLinkProxy: "0x0165878A594ca255338adfa4d48449f69242Eb8F",
    info: { uploadBlockNumber: 6, graphName: "" },
  },
  42: {
    reputationToken: "0x5d6d8f561547cf0ff677b2d729fd2127e6d36481",
    balancerFactory: "0x7757a7589bAC9D0B959B3721363Cf33665Ed2997",
    ammFactory: "0x9Cb241525d22B139D60b948238169D4fCdf19Fb0",
    marketFactories: {
      sportsball: {
        type: "SportsLink",
        address: "0x831E1E2AEab9332168C9853f92439DA4CdeAd188",
        collateral: "0x7079f3762805cff9c979a5bdc6f5648bcfee76c8",
      },
    },
    sportsLinkProxy: "0x9E973aA088BC2F957D892Aae06612c17219F5A40",
    info: { uploadBlockNumber: 25001975, graphName: "kovan" },
  },
};
