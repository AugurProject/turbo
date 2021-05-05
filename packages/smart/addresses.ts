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
  constructorArgs: ConstructorArg[];
  collateral: Collateral;
}
export type ConstructorArg = string | number;
export interface Collateral {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
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
    ammFactory: "0x0165878A594ca255338adfa4d48449f69242Eb8F",
    marketFactories: {
      sportsball: {
        type: "SportsLink",
        address: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
        constructorArgs: [
          "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
          "0x5FbDB2315678afecb367f032d93F642f64180aa3",
          "1000000000000",
          "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
          0,
          "500000000000000",
          "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
          0,
          "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
          4,
        ],
        collateral: {
          address: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
          name: "USDC",
          symbol: "USDC",
          decimals: 6,
        },
      },
      trustme: {
        type: "Trusted",
        address: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
        constructorArgs: [
          "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
          "0x5FbDB2315678afecb367f032d93F642f64180aa3",
          "1000000000000",
          "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
          0,
          "500000000000000",
          "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
          0,
        ],
        collateral: {
          address: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
          name: "USDC",
          symbol: "USDC",
          decimals: 6,
        },
      },
    },
  },
  42: {
    reputationToken: "0x889048125521599E96A1e551bA7b843073c7De10",
    balancerFactory: "0x7757a7589bAC9D0B959B3721363Cf33665Ed2997",
    ammFactory: "0x80802520c7379848854ceFd4Ea4bd7A1FAD1c9a4",
    marketFactories: {
      sportsball: {
        type: "SportsLink",
        address: "0xbfFa6a63d0eFe043B39E698630E71b433e0c72f0",
        constructorArgs: [
          "0x5Cfc719AD2d969e0A005541D6a562dae4a618A20",
          "0x5B9a38Bf07324B2Ff946F1ccdBD4698A8BC6c952",
          "1000000000000",
          "0x6eB468d092783F6644D2912ce732527F51357A4D",
          0,
          "500000000000000",
          "0x5Cfc719AD2d969e0A005541D6a562dae4a618A20",
          0,
          "0x5Cfc719AD2d969e0A005541D6a562dae4a618A20",
          4,
        ],
        collateral: {
          address: "0x5B9a38Bf07324B2Ff946F1ccdBD4698A8BC6c952",
          name: "USDC",
          symbol: "USDC",
          decimals: 6,
        },
      },
      trustme: {
        type: "Trusted",
        address: "0xe4D50264177222bBE24a0bC577c8AF33B1d63e28",
        constructorArgs: [
          "0x5Cfc719AD2d969e0A005541D6a562dae4a618A20",
          "0x5B9a38Bf07324B2Ff946F1ccdBD4698A8BC6c952",
          "1000000000000",
          "0x6eB468d092783F6644D2912ce732527F51357A4D",
          0,
          "500000000000000",
          "0x5Cfc719AD2d969e0A005541D6a562dae4a618A20",
          0,
        ],
        collateral: {
          address: "0x5B9a38Bf07324B2Ff946F1ccdBD4698A8BC6c952",
          name: "USDC",
          symbol: "USDC",
          decimals: 6,
        },
      },
    },
    theRundownChainlink: "0x468298834fb1E55Bb12b393BdFF6681Aa9c30099",
  },
};
