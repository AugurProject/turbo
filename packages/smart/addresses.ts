// This file is updated by deployer.
export interface Addresses {
  reputationToken: string;
  balancerFactory: string;
  // Lower index is newer.
  marketFactories: MarketFactory[];
  info: {
    uploadBlockNumber: number;
    graphName?: string; // optional because the graph doesn't support every network
  };
}
export interface MarketFactory {
  type: MarketFactoryType;
  address: string;
  collateral: string;
  ammFactory: string;
  description?: string; // for humans to read
  version?: string; // release version. for humans to read
}
export type MarketFactoryType = "SportsLink" | "Trusted" | "Crypto";
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
  137: {
    reputationToken: "0x435C88888388D73BD97dab3B3EE1773B084E0cdd",
    balancerFactory: "0x3eC09e2A4699951179B61c03434636746aBE61AA",
    marketFactories: [
      {
        description: "mlb and nba",
        version: "v1.0.0",
        type: "SportsLink",
        address: "0xEFA66e55707C43Db47D43fD65c2Ab4e861e989B6",
        collateral: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        ammFactory: "0x63BBEEa5085E94D1F57A5938f9a22dd485572Bb3",
      },
      {
        description: "mlb and nba",
        version: "v1.0.0-beta.7",
        type: "SportsLink",
        address: "0xd9AD92f448bf89eF1Fe1b2BcF0aBE7221Bb79652",
        collateral: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        ammFactory: "0x38dC258E914834fe1f2393f1dfCedeF69deD5Df4",
      },
      {
        description: "mma placeholder",
        type: "SportsLink",
        address: "0xBE7CF258fa0409677C1340D0e599C4dA9aB57c98",
        collateral: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        ammFactory: "0x63BBEEa5085E94D1F57A5938f9a22dd485572Bb3",
      },
    ],
    info: { uploadBlockNumber: 15336699, graphName: "matic" },
  },
  80001: {
    reputationToken: "0x1A921b8a13372Cc81A415d02627756b5418a71c9",
    balancerFactory: "0xE152327f9700F1733d12e7a507045FB4A4606C6F",
    marketFactories: [
      {
        type: "SportsLink",
        address: "0x2625b03D6fd0D3FcEAD9eF9ceADDF44dEAC6Ad6F",
        collateral: "0x5799bFe361BEea69f808328FF4884DF92f1f66f0",
        ammFactory: "0x43556B27e6Cd1c01Cd0945c5d53077dc1bB05FfD",
        description: "mma placeholder",
        version: "robert/crypto-market.0",
      },
      {
        type: "Crypto",
        address: "0x0B20E653DCF916AC8E43bc974E559Fdec9523c6D",
        collateral: "0x5799bFe361BEea69f808328FF4884DF92f1f66f0",
        ammFactory: "0x43556B27e6Cd1c01Cd0945c5d53077dc1bB05FfD",
        description: "crypto prices",
        version: "robert/crypto-market.0",
      },
      {
        type: "SportsLink",
        address: "0xAA0Ca3716C9C1710b404918489B1EE8B18C03781",
        collateral: "0x5799bFe361BEea69f808328FF4884DF92f1f66f0",
        ammFactory: "0x43556B27e6Cd1c01Cd0945c5d53077dc1bB05FfD",
        description: "mlb and nba",
        version: "robert/crypto-market.0",
      },
      {
        type: "SportsLink",
        address: "0x4225c4fe9A02706C7beC927A3DB25f29E273b3d1",
        collateral: "0x5799bFe361BEea69f808328FF4884DF92f1f66f0",
        ammFactory: "0x43556B27e6Cd1c01Cd0945c5d53077dc1bB05FfD",
        description: "mlb and nba",
        version: "v1.0.0",
      },
      {
        type: "SportsLink",
        address: "0x1ac5742415c071f376C81F6e2A7fE56eA19fb3dF",
        collateral: "0x5799bFe361BEea69f808328FF4884DF92f1f66f0",
        ammFactory: "0x8860542771F787dD8B2c8f9134662751DE2F664f",
        description: "mlb and nba",
        version: "v1.0.0-beta.7",
      },
      {
        type: "SportsLink",
        address: "0x44043E4B5B8633d0915822ddc86e6Df962D126b2",
        collateral: "0x5799bFe361BEea69f808328FF4884DF92f1f66f0",
        ammFactory: "0x43556B27e6Cd1c01Cd0945c5d53077dc1bB05FfD",
        description: "mma placeholder",
      },
    ],
    info: { uploadBlockNumber: 14691785, graphName: "mumbai" },
  },
};
