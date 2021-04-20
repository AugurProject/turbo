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
    reputationToken: "0x6f40e095501F98633bD2Dd8233537deA4a2cbA13",
    balancerFactory: "0x87f6475903F26158ADfDF795Bd195De87D4Ab990",
    ammFactory: "0xeDeb99aC75941c98483b50948edD7ef6f125751F",
    marketFactories: {
      sportsball: {
        type: "SportsLink",
        address: "0x3b2B9Eee08a2530cdaF9863340ec6d37Ca313214",
        collateral: "0x1Deb581A8005E51DE745cf082E69a1bBEba5a4D1",
      },
      trustme: {
        type: "Trusted",
        address: "0xfc01beB461c101b398a22160edc0d7FA533a4E68",
        collateral: "0x1Deb581A8005E51DE745cf082E69a1bBEba5a4D1",
      },
    },
  },
};
