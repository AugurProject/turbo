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
    reputationToken: "0x889048125521599E96A1e551bA7b843073c7De10",
    balancerFactory: "0x7757a7589bAC9D0B959B3721363Cf33665Ed2997",
    ammFactory: "0x959fd7834847D9A133ce530bDe21CdA50A2E7d31",
    marketFactories: {
      sportsball: {
        type: "SportsLink",
        address: "0xFDE7135E882CF7c078e2c1100154712aCd40145c",
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
        address: "0xFE48D94B3Ae76aaC4D8538A9E571921718867298",
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
  80001: {
    reputationToken: "0xD4fB02358d9694539eeD446E6531b1fFbA9b6931",
    balancerFactory: "0xE152327f9700F1733d12e7a507045FB4A4606C6F",
    ammFactory: "0x6F35cC6b6e66E4Feeee515F16F16e39bF705b0D0",
    marketFactories: {
      sportsball: {
        type: "SportsLink",
        address: "0x0579C97477E7b3c32be09d3d36E4D88Cab77CF8b",
        constructorArgs: [
          "0x8C9c733eCd48426b9c53c38ccB60F3b307329bE1",
          "0x5799bFe361BEea69f808328FF4884DF92f1f66f0",
          "1000000000000",
          "0xEaAbF3E7C974f33354779232BC2d135B7C2CcAB7",
          0,
          "500000000000000",
          "0x8C9c733eCd48426b9c53c38ccB60F3b307329bE1",
          0,
          "0x8C9c733eCd48426b9c53c38ccB60F3b307329bE1",
          4,
        ],
        collateral: {
          address: "0x5799bFe361BEea69f808328FF4884DF92f1f66f0",
          name: "USDC",
          symbol: "USDC",
          decimals: 6,
        },
      },
      trustme: {
        type: "Trusted",
        address: "0x6b0B5E33a3549c6a79061F76DeE1B631315219a3",
        constructorArgs: [
          "0x8C9c733eCd48426b9c53c38ccB60F3b307329bE1",
          "0x5799bFe361BEea69f808328FF4884DF92f1f66f0",
          "1000000000000",
          "0xEaAbF3E7C974f33354779232BC2d135B7C2CcAB7",
          0,
          "500000000000000",
          "0x8C9c733eCd48426b9c53c38ccB60F3b307329bE1",
          0,
        ],
        collateral: {
          address: "0x5799bFe361BEea69f808328FF4884DF92f1f66f0",
          name: "USDC",
          symbol: "USDC",
          decimals: 6,
        },
      },
    },
  },
};
