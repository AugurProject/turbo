// This file is updated by deployer.
export interface Addresses {
  reputationToken: string;
  balancerFactory: string;
  marketFactories: MarketFactories;
  ammFactory: string;
  sportsLinkProxy: string;
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
  80001: {
    reputationToken: "0xD4fB02358d9694539eeD446E6531b1fFbA9b6931",
    balancerFactory: "0xE152327f9700F1733d12e7a507045FB4A4606C6F",
    ammFactory: "0x657e19AC3C6F305979b9968f3E49e422f0E232C6",
    marketFactories: {
      sportsball: {
        type: "SportsLink",
        address: "0x965aC87691b7767A66bf00e9969b5638F4dE7b17",
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
        address: "0x75b8Ec997f12E4099C49E91527C6bE2929482650",
        constructorArgs: [
          "0x5Cfc719AD2d969e0A005541D6a562dae4a618A20",
          "0x5799bFe361BEea69f808328FF4884DF92f1f66f0",
          "1000000000000",
          "0xEaAbF3E7C974f33354779232BC2d135B7C2CcAB7",
          0,
          "500000000000000",
          "0x5Cfc719AD2d969e0A005541D6a562dae4a618A20",
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
    sportsLinkProxy: "0x38f3d3BaaE988e5d861a5A0C74a41c305A4cE745",
  },
};
