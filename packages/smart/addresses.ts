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
  42: {
    reputationToken: "0x400224D5C60f04829ee1fa30d6D34c07727c938E",
    balancerFactory: "0x7AF2600FBB954239B3148a36FA65d40341e2f833",
    ammFactory: "0xa3c66a83Bf96dc1dFd574ea431865D21f34f801D",
    marketFactories: {
      sportsball: {
        type: "SportsLink",
        address: "0xB0bA59d42Fb0f9305F06FC0e2C4e2fe64A5bd39F",
        constructorArgs: [
          "0x5Cfc719AD2d969e0A005541D6a562dae4a618A20",
          "0x649E1b656c76775c6A53f95784389E8C6bbdbfBF",
          "1000000000000",
          "0x92Ae2A9B4D97ed0f13F3df71aB36948C53b15734",
          "0",
          "500000000000000",
          "0x5Cfc719AD2d969e0A005541D6a562dae4a618A20",
          "0",
          "0x5Cfc719AD2d969e0A005541D6a562dae4a618A20",
        ],
        collateral: {
          address: "0x649E1b656c76775c6A53f95784389E8C6bbdbfBF",
          name: "USDC",
          symbol: "USDC",
          decimals: 6,
        },
      },
      trustme: {
        type: "Trusted",
        address: "0xE637e165aec68D85C80aDEB70520612e630eFB82",
        constructorArgs: [
          "0x5Cfc719AD2d969e0A005541D6a562dae4a618A20",
          "0x649E1b656c76775c6A53f95784389E8C6bbdbfBF",
          "1000000000000",
          "0x92Ae2A9B4D97ed0f13F3df71aB36948C53b15734",
          "0",
          "500000000000000",
          "0x5Cfc719AD2d969e0A005541D6a562dae4a618A20",
          "0",
        ],
        collateral: {
          address: "0x649E1b656c76775c6A53f95784389E8C6bbdbfBF",
          name: "USDC",
          symbol: "USDC",
          decimals: 6,
        },
      },
    },
  },
};
