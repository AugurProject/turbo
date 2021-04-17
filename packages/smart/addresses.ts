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
  OptimismKovan = 69,
  OptimismLocal = 420,
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
    reputationToken: "0xEd5A05A4B31f9CCA1E3bb03F76bdF2d88204b1a5",
    balancerFactory: "0xa7503Fa3F8af11923B8FA0cfaaf607A62EbB8bB9",
    ammFactory: "0x8D13ef08fb43e2266acB9257Da0b264CD5717f59",
    marketFactories: {
      sportsball: {
        type: "SportsLink",
        address: "0x85096ca3Ac86Abd5c68B6eC63387AF66D0F20735",
        constructorArgs: [
          "0x5Cfc719AD2d969e0A005541D6a562dae4a618A20",
          "0xa2A9957E4cf252123BA866b793F2c4a0fdbcE148",
          "1000000000000",
          "0x67231a19201B5dE00A47e9bf768e8F884BF50e24",
          "0",
          "5000000000000000",
        ],
        collateral: {
          address: "0xa2A9957E4cf252123BA866b793F2c4a0fdbcE148",
          name: "USDC",
          symbol: "USDC",
          decimals: 6,
        },
      },
      trustme: {
        type: "Trusted",
        address: "0xfdB64CFbEEC3dac1387D3bFaa3c4Fd070245De0a",
        constructorArgs: [
          "0x5Cfc719AD2d969e0A005541D6a562dae4a618A20",
          "0xa2A9957E4cf252123BA866b793F2c4a0fdbcE148",
          "1000000000000",
          "0x67231a19201B5dE00A47e9bf768e8F884BF50e24",
          "0",
          "5000000000000000",
        ],
        collateral: {
          address: "0xa2A9957E4cf252123BA866b793F2c4a0fdbcE148",
          name: "USDC",
          symbol: "USDC",
          decimals: 6,
        },
      },
    },
  },
};
