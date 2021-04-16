// This file is updated by deployer.
export interface Addresses {
  collateral: string;
  reputationToken: string;
  balancerFactory: string;
  marketFactories: MarketFactories;
  ammFactory: string;
  theRundownChainlink?: string;
}
export type MarketFactories = {
  [name: string]: MarketFactory;
};
export interface MarketFactory {
  type: MarketFactoryType;
  address: string;
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
}
type AddressMapping = {
  [id in ChainId]?: Addresses;
};
export const addresses: AddressMapping = {
  31337: {
    collateral: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    reputationToken: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    balancerFactory: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    ammFactory: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
    marketFactories: {
      sportsball: {
        type: "SportsLink",
        address: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
      },
      trustme: {
        type: "Trusted",
        address: "0x0165878A594ca255338adfa4d48449f69242Eb8F",
      },
    },
  },
  42: {
    collateral: "0xe05bd06aCb933A38AC805A917d8De3804A3f9946",
    reputationToken: "0xE149CD0a28cB389Ff3f6DB4391eEF848b1B60cef",
    balancerFactory: "0x0F23A3D55d5914fcBA222b47f3Bb15BC4412468E",
    ammFactory: "0x1DbEE5958e3CafE4F553F28B228A55f2136ceF0a",
    marketFactories: {
      sportsball: {
        type: "SportsLink",
        address: "0x88cCe76aA162CDa7C0405154857ef1D3f9E4fEaD",
      },
      trustme: {
        type: "Trusted",
        address: "0x3fB7eA773Ce0DC3EAA9e1b4812e5Edf8F207F5b2",
      },
    },
  },
};
