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
    reputationToken: "0x2101ae7832c3e9096b2E5C00B6b80DE008359603",
    balancerFactory: "0xD6D8aB2BA1096E0A8F9E2380E29A345436DF6542",
    ammFactory: "0x48CFE5Ac2Bd221bA8418d8d19AEC4476496a50e4",
    marketFactories: {
      sportsball: {
        type: "SportsLink",
        address: "0x397018eFcC4780921D932ef67455E8Af0eCC4efA",
        constructorArgs: [
          "0x5Cfc719AD2d969e0A005541D6a562dae4a618A20",
          "0x5Ce0584F57d10016EF81bDA485fF650a8411A7fc",
          "1000000000000",
          "0xf4e8b109fc051F0c0b1dB2457a512836aFA2D143",
          "0",
          "5000000000000000",
        ],
        collateral: {
          address: "0x5Ce0584F57d10016EF81bDA485fF650a8411A7fc",
          name: "USDC",
          symbol: "USDC",
          decimals: 6,
        },
      },
      trustme: {
        type: "Trusted",
        address: "0x06352C1e7c46702d3a8F1730A94d2e43752c7Add",
        constructorArgs: [
          "0x5Cfc719AD2d969e0A005541D6a562dae4a618A20",
          "0x5Ce0584F57d10016EF81bDA485fF650a8411A7fc",
          "1000000000000",
          "0xf4e8b109fc051F0c0b1dB2457a512836aFA2D143",
          "0",
          "5000000000000000",
        ],
        collateral: {
          address: "0x5Ce0584F57d10016EF81bDA485fF650a8411A7fc",
          name: "USDC",
          symbol: "USDC",
          decimals: 6,
        },
      },
    },
  },
};
