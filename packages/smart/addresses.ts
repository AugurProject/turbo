// This file is updated by deployer.
export interface Addresses {
  reputationToken: string;
  balancerFactory: string;
  marketFactories: MarketFactories;
  ammFactory: string;
  sportsLinkProxy: string;
  info: {
    uploadBlockNumber: number;
    graphName?: string; // optional because the graph doesn't support every network
  };
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
  MaticMainnet = 137,
}
export const graphChainNames: {
  [chainId: number]: string;
} = {
  1: "mainnet",
  3: "ropsten",
  4: "rinkeby",
  42: "kovan",
  80001: "mumbai",
  137: "matic",
};
type AddressMapping = {
  [id in ChainId]?: Addresses;
};
export const addresses: AddressMapping = {
  80001: {
    reputationToken: "0xD4fB02358d9694539eeD446E6531b1fFbA9b6931",
    balancerFactory: "0xE152327f9700F1733d12e7a507045FB4A4606C6F",
    ammFactory: "0x8860542771F787dD8B2c8f9134662751DE2F664f",
    marketFactories: {
      sportsball: {
        type: "SportsLink",
        address: "0x43D9f2d22f1306D012251d032a5B67553FE4aA82",
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
        address: "0x0015ee2871e93e02aEc91b21cCe7715a69B266E7",
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
    sportsLinkProxy: "0x85F64F63eD841e111C6Ec31B7DB4821Bf0E633d7",
    info: { uploadBlockNumber: 13994149, graphName: "mumbai" },
  },
  137: {
    reputationToken: "0xae8aa4252B7DB37935C4d16E3b2A9F3c46d9749d",
    balancerFactory: "0xafeBD08B1A4473e56e9a17d6F4B060929f29CCA2",
    ammFactory: "0x0b7e490D6cF3BE96830273FD2BcDcE69659bbC41",
    marketFactories: {
      sportsball: {
        type: "SportsLink",
        address: "0xD5a3A8B14B50D529B3C159bAeB36F1382011E923",
        constructorArgs: [
          "0xDb61C1457e838c08ebd57AC60834628c1c5B902A",
          "0xe0e14c219965105a7065e88317772c2D5758C120",
          "1000000000000",
          "0xD25eF673301B403abbA335c2Fa8Cffb0c966393c",
          0,
          "500000000000000",
          "0xDb61C1457e838c08ebd57AC60834628c1c5B902A",
          0,
          "0xDb61C1457e838c08ebd57AC60834628c1c5B902A",
          4,
        ],
        collateral: {
          address: "0xe0e14c219965105a7065e88317772c2D5758C120",
          name: "USDC",
          symbol: "USDC",
          decimals: 6,
        },
      },
      trustme: {
        type: "Trusted",
        address: "0x08b0ED389A9c023D528065663a1F89B75B7B4F42",
        constructorArgs: [
          "0xDb61C1457e838c08ebd57AC60834628c1c5B902A",
          "0xe0e14c219965105a7065e88317772c2D5758C120",
          "1000000000000",
          "0xD25eF673301B403abbA335c2Fa8Cffb0c966393c",
          0,
          "500000000000000",
          "0xDb61C1457e838c08ebd57AC60834628c1c5B902A",
          0,
        ],
        collateral: {
          address: "0xe0e14c219965105a7065e88317772c2D5758C120",
          name: "USDC",
          symbol: "USDC",
          decimals: 6,
        },
      },
    },
    sportsLinkProxy: "0x064886d5933593C2C7AF449403635C696A43cD87",
    info: { uploadBlockNumber: 14500254, graphName: "matic" },
  },
};
