// This file is updated by deployer.
export interface Addresses {
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
}
type AddressMapping = {
  [id in ChainId]?: Addresses;
};
export const addresses: AddressMapping = {
  31337: {
    reputationToken: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    balancerFactory: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    ammFactory: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
    marketFactories: {
      sportsball: {
        type: "SportsLink",
        address: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
        collateral: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      },
      trustme: {
        type: "Trusted",
        address: "0x0165878A594ca255338adfa4d48449f69242Eb8F",
        collateral: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      },
    },
  },
  42: {
    reputationToken: "0xe3ee127f2F7Fe9Dba9197d7B1241bE89DDd55C2E",
    balancerFactory: "0x044EC25DB006F25F809ebaB6fEFCD600C89cD7d8",
    ammFactory: "0x7495Bf7311039AD14243E2067b30B541149890fE",
    marketFactories: {
      sportsball: {
        type: "SportsLink",
        address: "0x3b834B11D00EC677D658c11f64608Dde72eAe2cE",
        collateral: "0xB05fD0221DD4A71F41fBFc0EB6b481B95A13b14e",
      },
      trustme: {
        type: "Trusted",
        address: "0x91137a3dD443E9f991aCf04407A0f961A88843BF",
        collateral: "0xB05fD0221DD4A71F41fBFc0EB6b481B95A13b14e",
      },
    },
  },
};
