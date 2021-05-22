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
  31337: {
    reputationToken: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    balancerFactory: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    ammFactory: "0x0165878A594ca255338adfa4d48449f69242Eb8F",
    marketFactories: {
      sportsball: {
        type: "SportsLink",
        address: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
        collateral: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      },
      mma: {
        type: "SportsLink",
        address: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
        collateral: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      },
    },
    info: { uploadBlockNumber: 7, graphName: "" },
  },
  80001: {
    reputationToken: "0x1A921b8a13372Cc81A415d02627756b5418a71c9",
    balancerFactory: "0xE152327f9700F1733d12e7a507045FB4A4606C6F",
    ammFactory: "0x8860542771F787dD8B2c8f9134662751DE2F664f",
    marketFactories: {
      sportsball: {
        type: "SportsLink",
        address: "0xBC8C695dd045FBfe81C353Fd88E3bedE45C2855D",
        collateral: "0x5799bFe361BEea69f808328FF4884DF92f1f66f0",
      },
      sportsball2: {
        type: "SportsLink",
        address: "0x1ac5742415c071f376C81F6e2A7fE56eA19fb3dF",
        collateral: "0x5799bFe361BEea69f808328FF4884DF92f1f66f0",
      },
      mma: {
        type: "SportsLink",
        address: "0xb2a568C444C6B74D10f7cf66bEcfeAF88a94808a",
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
      sportsball2: {
        type: "SportsLink",
        address: "0xd9AD92f448bf89eF1Fe1b2BcF0aBE7221Bb79652",
        collateral: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
      },
      sportsball: {
        type: "SportsLink",
        address: "0x6b53958e2961A30E3Ebbdb6AD03AA7ae88A3C79d",
        collateral: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
      },
    },
    info: { uploadBlockNumber: 14853228, graphName: "matic" },
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
    info: { uploadBlockNumber: 25001975, graphName: "kovan" },
  },
};
