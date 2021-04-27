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
    reputationToken: "0xCC80648E4c571FEa9EBb4e4903Eb71A4E4c7e28A",
    balancerFactory: "0x9dD6153D7b909Aca79473f0e581B9449A33D965f",
    ammFactory: "0xBcf1606F65BD76A693E432ec6c0446118210B26f",
    marketFactories: {
      sportsball: {
        type: "SportsLink",
        address: "0x47a54B4Dd096fd58829A1F663b1D4e4642b7851D",
        constructorArgs: [
          "0x5Cfc719AD2d969e0A005541D6a562dae4a618A20",
          "0x63B984980893219d2FCcCBb29a365DF8a6e98D6a",
          "1000000000000",
          "0x8fC01FF20a776889Bcc2249cf9689228327AE0a1",
          "0",
          "5000000000000000",
        ],
        collateral: {
          address: "0x63B984980893219d2FCcCBb29a365DF8a6e98D6a",
          name: "USDC",
          symbol: "USDC",
          decimals: 6,
        },
      },
      trustme: {
        type: "Trusted",
        address: "0x192b544f3F7868570d9EA502aE01d13d20c64F12",
        constructorArgs: [
          "0x5Cfc719AD2d969e0A005541D6a562dae4a618A20",
          "0x63B984980893219d2FCcCBb29a365DF8a6e98D6a",
          "1000000000000",
          "0x8fC01FF20a776889Bcc2249cf9689228327AE0a1",
          "0",
          "5000000000000000",
        ],
        collateral: {
          address: "0x63B984980893219d2FCcCBb29a365DF8a6e98D6a",
          name: "USDC",
          symbol: "USDC",
          decimals: 6,
        },
      },
    },
  },
};
