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
    reputationToken: "0x8c47eFDCF33F635e9A3f60fe94bE461d209d5322",
    balancerFactory: "0x9fcadea7c68f1D931D79DCd2A046dCf2D572E4F4",
    ammFactory: "0x3fe9C3175c0721CFbb3AD578eEc7117C5e26cfB3",
    marketFactories: {
      sportsball: {
        type: "SportsLink",
        address: "0x779bD416785BD5247E891F26659dB0cd4b59268D",
        constructorArgs: [
          "0x5Cfc719AD2d969e0A005541D6a562dae4a618A20",
          "0xe0927a5F474a57111A7F5Ee048C351920d1b45A0",
          "1000000000000",
          "0x4095Aea7C14518a98Df8915CA86b0f319645A987",
          "0",
          "500000000000000",
          "0x5Cfc719AD2d969e0A005541D6a562dae4a618A20",
          "0",
          "0x5Cfc719AD2d969e0A005541D6a562dae4a618A20",
        ],
        collateral: {
          address: "0xe0927a5F474a57111A7F5Ee048C351920d1b45A0",
          name: "USDC",
          symbol: "USDC",
          decimals: 6,
        },
      },
      trustme: {
        type: "Trusted",
        address: "0xa8c215c0109Acd399100Fa8F589C8727A4486a3D",
        constructorArgs: [
          "0x5Cfc719AD2d969e0A005541D6a562dae4a618A20",
          "0xe0927a5F474a57111A7F5Ee048C351920d1b45A0",
          "1000000000000",
          "0x4095Aea7C14518a98Df8915CA86b0f319645A987",
          "0",
          "500000000000000",
          "0x5Cfc719AD2d969e0A005541D6a562dae4a618A20",
          "0",
        ],
        collateral: {
          address: "0xe0927a5F474a57111A7F5Ee048C351920d1b45A0",
          name: "USDC",
          symbol: "USDC",
          decimals: 6,
        },
      },
    },
  },
};
