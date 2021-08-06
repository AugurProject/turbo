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
  type: MarketFactoryType; // matches market factories that share markets
  subtype: MarketFactorySubType; // for determining which ABI to use
  address: string;
  collateral: string;
  ammFactory: string;
  fetcher: string;
  description?: string; // for humans to read
  version?: string; // release version. for humans to read
}
export type MarketFactoryType = "SportsLink" | "MMALink" | "Trusted" | "Crypto";
export type MarketFactorySubType = "V1" | "V2";
export type MarketFactoryContractName =
  | "SportsLinkMarketFactory"
  | "MMALinkMarketFactory"
  | "CryptoMarketFactory"
  | "TrustedMarketFactory";
export type FetcherContractName = "NBAFetcher" | "MMAFetcher" | "";
export const marketFactoryTypeToContractName: {
  [Property in MarketFactoryType]: MarketFactoryContractName;
} = {
  SportsLink: "SportsLinkMarketFactory",
  MMALink: "MMALinkMarketFactory",
  Crypto: "CryptoMarketFactory",
  Trusted: "TrustedMarketFactory",
};
export const marketFactoryTypeToFetcherName: {
  [Property in MarketFactoryType]: FetcherContractName;
} = {
  SportsLink: "NBAFetcher",
  MMALink: "MMAFetcher",
  Crypto: "",
  Trusted: "",
};
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
        subtype: "V1",
        address: "0xEFA66e55707C43Db47D43fD65c2Ab4e861e989B6",
        collateral: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        ammFactory: "0x63BBEEa5085E94D1F57A5938f9a22dd485572Bb3",
        fetcher: "",
      },
      {
        description: "mlb and nba",
        version: "v1.0.0-beta.7",
        type: "SportsLink",
        subtype: "V1",
        address: "0xd9AD92f448bf89eF1Fe1b2BcF0aBE7221Bb79652",
        collateral: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        ammFactory: "0x38dC258E914834fe1f2393f1dfCedeF69deD5Df4",
        fetcher: "",
      },
    ],
    info: { uploadBlockNumber: 15336699, graphName: "matic" },
  },
  80001: {
    reputationToken: "0x1A921b8a13372Cc81A415d02627756b5418a71c9",
    balancerFactory: "0xE152327f9700F1733d12e7a507045FB4A4606C6F",
    marketFactories: [
      {
        type: "MMALink",
        subtype: "V2",
        address: "0x32D7c4D23ca8520A22fCF759505dEd07546314a9",
        collateral: "0x5799bFe361BEea69f808328FF4884DF92f1f66f0",
        ammFactory: "0xf098b85047CfB29840a3a43194AbCb31d5C53E16",
        fetcher: "0x4D8EEcE37100D7C280d21DBCDBb1dC1DED16B1eB",
        description: "mma",
        version: "2021-07-20.0",
      },
      {
        type: "Crypto",
        subtype: "V2",
        address: "0xcc2f7557B35154d45532cCE9CA2F88B87358a3c8",
        collateral: "0x5799bFe361BEea69f808328FF4884DF92f1f66f0",
        ammFactory: "0xf098b85047CfB29840a3a43194AbCb31d5C53E16",
        fetcher: "",
        description: "crypto prices",
        version: "2021-07-20.0",
      },
      {
        type: "SportsLink",
        subtype: "V2",
        address: "0x5524863C74404FC2776Bacb633F3D91fF8143df8",
        collateral: "0x5799bFe361BEea69f808328FF4884DF92f1f66f0",
        ammFactory: "0xf098b85047CfB29840a3a43194AbCb31d5C53E16",
        fetcher: "0x576937347484521B84D780743369a2487E83bB37",
        description: "mlb and nba",
        version: "2021-07-20.0",
      },
      {
        type: "SportsLink",
        subtype: "V1",
        address: "0x203fdF154b636D834ABC015Ca6Dc9C6127659c58",
        collateral: "0x5799bFe361BEea69f808328FF4884DF92f1f66f0",
        ammFactory: "0xeC82F887613AFf163949A0b56b7e67222952c92d",
        fetcher: "",
        description: "mlb and nba",
        version: "2021-07-01.0",
      },
      {
        type: "SportsLink",
        subtype: "V1",
        address: "0x4225c4fe9A02706C7beC927A3DB25f29E273b3d1",
        collateral: "0x5799bFe361BEea69f808328FF4884DF92f1f66f0",
        ammFactory: "0x43556B27e6Cd1c01Cd0945c5d53077dc1bB05FfD",
        fetcher: "",
        description: "mlb and nba",
        version: "v1.0.0",
      },
      {
        type: "SportsLink",
        subtype: "V1",
        address: "0x1ac5742415c071f376C81F6e2A7fE56eA19fb3dF",
        collateral: "0x5799bFe361BEea69f808328FF4884DF92f1f66f0",
        ammFactory: "0x8860542771F787dD8B2c8f9134662751DE2F664f",
        fetcher: "",
        description: "mlb and nba",
        version: "v1.0.0-beta.7",
      },
    ],
    info: { uploadBlockNumber: 15336699, graphName: "mumbai" },
  },
  31337: {
    reputationToken: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    balancerFactory: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    marketFactories: [
      {
        type: "MMALink",
        subtype: "V1",
        address: "0x9A676e781A523b5d0C0e43731313A708CB607508",
        collateral: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        ammFactory: "0x59b670e9fA9D0A427751Af201D676719a970857b",
        fetcher: "0x0B306BF915C4d645ff596e518fAf3F9669b97016",
        description: "mma",
        version: "FILL THIS OUT",
      },
      {
        type: "Crypto",
        subtype: "V1",
        address: "0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1",
        collateral: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        ammFactory: "0x59b670e9fA9D0A427751Af201D676719a970857b",
        fetcher: "",
        description: "crypto prices",
        version: "FILL THIS OUT",
      },
      {
        type: "SportsLink",
        subtype: "V2",
        address: "0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0",
        collateral: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        ammFactory: "0x59b670e9fA9D0A427751Af201D676719a970857b",
        fetcher: "0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82",
        description: "mlb and nba",
        version: "FILL THIS OUT",
      },
      {
        type: "MMALink",
        subtype: "V1",
        address: "0xD8a5a9b31c3C0232E196d518E89Fd8bF83AcAd43",
        collateral: "0xc351628EB244ec633d5f21fBD6621e1a683B1181",
        ammFactory: "0xf4B146FbA71F41E0592668ffbF264F1D186b2Ca8",
        fetcher: "0xDC11f7E700A4c898AE5CAddB1082cFfa76512aDD",
        description: "mma",
        version: "FILL THIS OUT",
      },
      {
        type: "Crypto",
        subtype: "V1",
        address: "0x51A1ceB83B83F1985a81C295d1fF28Afef186E02",
        collateral: "0xc351628EB244ec633d5f21fBD6621e1a683B1181",
        ammFactory: "0xf4B146FbA71F41E0592668ffbF264F1D186b2Ca8",
        fetcher: "",
        description: "crypto prices",
        version: "FILL THIS OUT",
      },
      {
        type: "SportsLink",
        subtype: "V2",
        address: "0x21dF544947ba3E8b3c32561399E88B52Dc8b2823",
        collateral: "0xc351628EB244ec633d5f21fBD6621e1a683B1181",
        ammFactory: "0xf4B146FbA71F41E0592668ffbF264F1D186b2Ca8",
        fetcher: "0x2E2Ed0Cfd3AD2f1d34481277b3204d807Ca2F8c2",
        description: "mlb and nba",
        version: "FILL THIS OUT",
      },
    ],
    info: { uploadBlockNumber: 22, graphName: "" },
  },
  42: {
    reputationToken: "0xe328Aed56F6a283a53983D0f54D151CaB055567F",
    balancerFactory: "0x7757a7589bAC9D0B959B3721363Cf33665Ed2997",
    marketFactories: [
      {
        type: "MMALink",
        subtype: "V1",
        address: "0x683a51d7f9f5d99282313b57d6b52105bdfc4a09",
        collateral: "0x5B9a38Bf07324B2Ff946F1ccdBD4698A8BC6c952",
        ammFactory: "0x3312ca17Bbd64CcdCeEe2807046Cf59Cae611D5d",
        fetcher: "0xdeBA66281b74AA20D10219f131fB2978dA1E17e3",
        description: "mma",
        version: "FILL THIS OUT",
      },
      {
        type: "Crypto",
        subtype: "V1",
        address: "0x9668867568f0D523d18992015CeEF1169063F405",
        collateral: "0x5B9a38Bf07324B2Ff946F1ccdBD4698A8BC6c952",
        ammFactory: "0x3312ca17Bbd64CcdCeEe2807046Cf59Cae611D5d",
        fetcher: "",
        description: "crypto prices",
        version: "FILL THIS OUT",
      },
      {
        type: "SportsLink",
        subtype: "V2",
        address: "0xc5Df90F0C1ea41c7181814541c10Cc50BAB84Ce7",
        collateral: "0x5B9a38Bf07324B2Ff946F1ccdBD4698A8BC6c952",
        ammFactory: "0x3312ca17Bbd64CcdCeEe2807046Cf59Cae611D5d",
        fetcher: "0x51f217c580b86F4F2B88b89C8CBdDaADbBC95595",
        description: "mlb and nba",
        version: "FILL THIS OUT",
      },
    ],
    info: { uploadBlockNumber: 26422983, graphName: "kovan" },
  },
};
