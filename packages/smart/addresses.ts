// This file is updated by deployer.
export interface Addresses {
  reputationToken: string;
  balancerFactory: string;
  marketFactories: MarketFactories;
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
  ammFactory: string;
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
    marketFactories: {
      sportsball: {
        type: "SportsLink",
        address: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
        collateral: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        ammFactory: "0x0165878A594ca255338adfa4d48449f69242Eb8F",

      },
      mma: {
        type: "SportsLink",
        address: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
        collateral: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        ammFactory: "0x0165878A594ca255338adfa4d48449f69242Eb8F",
      },
    },
    info: { uploadBlockNumber: 7, graphName: "" },
  },
  80001: {
    reputationToken: "0x1A921b8a13372Cc81A415d02627756b5418a71c9",
    balancerFactory: "0xE152327f9700F1733d12e7a507045FB4A4606C6F",
    marketFactories: {
      sportsball2: {
        type: "SportsLink",
        address: "0x4225c4fe9A02706C7beC927A3DB25f29E273b3d1",
        collateral: "0x5799bFe361BEea69f808328FF4884DF92f1f66f0",
        ammFactory: "0x43556B27e6Cd1c01Cd0945c5d53077dc1bB05FfD",
      },
      sportsball: {
        type: "SportsLink",
        address: "0x1ac5742415c071f376C81F6e2A7fE56eA19fb3dF",
        collateral: "0x5799bFe361BEea69f808328FF4884DF92f1f66f0",
        ammFactory: "0x8860542771F787dD8B2c8f9134662751DE2F664f"
      },
      mma: {
        type: "SportsLink",
        address: "0x44043E4B5B8633d0915822ddc86e6Df962D126b2",
        collateral: "0x5799bFe361BEea69f808328FF4884DF92f1f66f0",
        ammFactory: "0x43556B27e6Cd1c01Cd0945c5d53077dc1bB05FfD"
      },
    },
    info: { uploadBlockNumber: 14691785, graphName: "mumbai" },
  },
  137: {
    reputationToken: "0x435C88888388D73BD97dab3B3EE1773B084E0cdd",
    balancerFactory: "0x3eC09e2A4699951179B61c03434636746aBE61AA",
    marketFactories: {
      sportsball2: {
        type: "SportsLink",
        address: "0xEFA66e55707C43Db47D43fD65c2Ab4e861e989B6",
        collateral: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        ammFactory: "0x63BBEEa5085E94D1F57A5938f9a22dd485572Bb3",
      },
      sportsball: {
        type: "SportsLink",
        address: "0xd9AD92f448bf89eF1Fe1b2BcF0aBE7221Bb79652",
        collateral: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        ammFactory: "0x38dC258E914834fe1f2393f1dfCedeF69deD5Df4"
      },
      mma: {
        type: "SportsLink",
        address: "0xBE7CF258fa0409677C1340D0e599C4dA9aB57c98",
        collateral: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        ammFactory: "0x63BBEEa5085E94D1F57A5938f9a22dd485572Bb3",
      },
    },
    info: { uploadBlockNumber: 15336699, graphName: "matic" },
  },
};
