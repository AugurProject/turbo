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
    reputationToken: "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6",
    balancerFactory: "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318",
    ammFactory: "0x610178dA211FEF7D417bC0e6FeD39F05609AD788",
    marketFactories: {
      sportsball: {
        type: "SportsLink",
        address: "0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0",
        constructorArgs: [
          "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
          "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
          "1000000000000",
          "0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e",
          "0",
          "5000000000000000",
        ],
        collateral: {
          address: "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
          name: "USDC",
          symbol: "USDC",
          decimals: 6,
        },
      },
      trustme: {
        type: "Trusted",
        address: "0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82",
        constructorArgs: [
          "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
          "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
          "1000000000000",
          "0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e",
          "0",
          "5000000000000000",
        ],
        collateral: {
          address: "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
          name: "USDC",
          symbol: "USDC",
          decimals: 6,
        },
      },
    },
  },
  42: {
    reputationToken: "0xf04213865F39Bae8F43C50059211193847C60fD4",
    balancerFactory: "0xDFB164afaEB4A2ad7c430A4d76F42172200F031b",
    ammFactory: "0x72FFcd0879870fad677e90adc7bD66B524111392",
    marketFactories: {
      sportsball: {
        type: "SportsLink",
        address: "0xd3417bCf5d816c5A8A865dE0430746e9A38e3861",
        constructorArgs: [
          "0x5Cfc719AD2d969e0A005541D6a562dae4a618A20",
          "0xAa7E847A063A8d739c9ddebB2e936BE162d3C9bF",
          "1000000000000",
          "0x8F8cAaBBE7909E803336Cf20FB083BDc83D40855",
          "0",
          "5000000000000000",
        ],
        collateral: {
          address: "0xAa7E847A063A8d739c9ddebB2e936BE162d3C9bF",
          name: "USDC",
          symbol: "USDC",
          decimals: 6,
        },
      },
      trustme: {
        type: "Trusted",
        address: "0x34A474a75Aa50C7ebFEa1F9936f6F449F3b5E80f",
        constructorArgs: [
          "0x5Cfc719AD2d969e0A005541D6a562dae4a618A20",
          "0xAa7E847A063A8d739c9ddebB2e936BE162d3C9bF",
          "1000000000000",
          "0x8F8cAaBBE7909E803336Cf20FB083BDc83D40855",
          "0",
          "5000000000000000",
        ],
        collateral: {
          address: "0xAa7E847A063A8d739c9ddebB2e936BE162d3C9bF",
          name: "USDC",
          symbol: "USDC",
          decimals: 6,
        },
      },
    },
  },
};
