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
  42: {
    reputationToken: "0x773B956634C3A3Dab6Fe4787d1fb98ceaAE25eAD",
    balancerFactory: "0x59FfbeBBBe873Ba4bfdbA3B7a63E221c6243EfEA",
    ammFactory: "0xaed5d90cC0b3E855914D5dC76e4f79a031715963",
    marketFactories: {
      sportsball: {
        type: "SportsLink",
        address: "0x1241fc05166D282b56caF96cFfBC551d10d645F2",
        constructorArgs: [
          "0x5Cfc719AD2d969e0A005541D6a562dae4a618A20",
          "0x2bD6870231204bE256d5B0e37CD948ec7B11C0fa",
          "1000000000000",
          "0x57123057Dbf17E98fdf4E3D35Ee3b3f8B7ea7a72",
          "0",
          "5000000000000000",
        ],
        collateral: {
          address: "0x2bD6870231204bE256d5B0e37CD948ec7B11C0fa",
          name: "USDC",
          symbol: "USDC",
          decimals: 6,
        },
      },
      trustme: {
        type: "Trusted",
        address: "0x15847053fbbD660ebEB4d905A13C92963526C94e",
        constructorArgs: [
          "0x5Cfc719AD2d969e0A005541D6a562dae4a618A20",
          "0x2bD6870231204bE256d5B0e37CD948ec7B11C0fa",
          "1000000000000",
          "0x57123057Dbf17E98fdf4E3D35Ee3b3f8B7ea7a72",
          "0",
          "5000000000000000",
        ],
        collateral: {
          address: "0x2bD6870231204bE256d5B0e37CD948ec7B11C0fa",
          name: "USDC",
          symbol: "USDC",
          decimals: 6,
        },
      },
    },
  },
  31337: {
    reputationToken: "0xa85233C63b9Ee964Add6F2cffe00Fd84eb32338f",
    balancerFactory: "0x4A679253410272dd5232B3Ff7cF5dbB88f295319",
    ammFactory: "0x7a2088a1bFc9d81c55368AE168C2C02570cB814F",
    marketFactories: {
      sportsball: {
        type: "SportsLink",
        address: "0xc5a5C42992dECbae36851359345FE25997F5C42d",
        constructorArgs: [
          "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
          "0x322813Fd9A801c5507c9de605d63CEA4f2CE6c44",
          "1000000000000",
          "0x09635F643e140090A9A8Dcd712eD6285858ceBef",
          "0",
          "5000000000000000",
          "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
          "0",
          "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        ],
        collateral: {
          address: "0x322813Fd9A801c5507c9de605d63CEA4f2CE6c44",
          name: "USDC",
          symbol: "USDC",
          decimals: 6,
        },
      },
      trustme: {
        type: "Trusted",
        address: "0x67d269191c92Caf3cD7723F116c85e6E9bf55933",
        constructorArgs: [
          "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
          "0x322813Fd9A801c5507c9de605d63CEA4f2CE6c44",
          "1000000000000",
          "0x09635F643e140090A9A8Dcd712eD6285858ceBef",
          "0",
          "5000000000000000",
          "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
          "0",
        ],
        collateral: {
          address: "0x322813Fd9A801c5507c9de605d63CEA4f2CE6c44",
          name: "USDC",
          symbol: "USDC",
          decimals: 6,
        },
      },
    },
  },
};
