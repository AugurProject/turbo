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
    ammFactory: "0x9381D4B5e7bEB89899da34dA60Ed5170D91E032A",
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
        address: "0x4117A1F75Dfe784F315AabF7dB8caf86Fc10653b",
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
    sportsLinkProxy: "0xAC049536d68F0C87894d1fC09fA070F6a00b893B",
    info: { uploadBlockNumber: 13971264, graphName: "mumbai" },
  },
  137: {
    reputationToken: "0xae8aa4252B7DB37935C4d16E3b2A9F3c46d9749d",
    balancerFactory: "0xafeBD08B1A4473e56e9a17d6F4B060929f29CCA2",
    ammFactory: "0x54Ea954F4A285f1D3cA8EC05B2bf5e59548d88a4",
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
    info: { uploadBlockNumber: 14634614, graphName: "matic" },
  },
};
