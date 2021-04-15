// This file is updated by deployer.
export interface Addresses {
  collateral: string;
  reputationToken: string;
  balancerFactory: string;
  marketFactory: string;
  ammFactory: string;
  theRundownChainlink: string;
}
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
  212984383488152: {
    collateral: "0xe5aa91537A66e884178B2A9faD97afFfe78b5EC5",
    reputationToken: "0xA50667Cf776fcb033001F1ff54fC313E90ABE508",
    balancerFactory: "0x60d10F04E830B5E5430C4e850d43127e893Ac396",
    marketFactory: "0x1a6B0282AfD831aC7872cf61BcF82843B1FB9E2f",
    ammFactory: "0x6662b8850cE9455f1E1dd9A5f65103C0685A0FeE",
    theRundownChainlink: "0x30b3533CcfD1637fD0065B359E1289F13246203c",
  },
  80001: {
    collateral: "0x0aE2e61C5f0C5d40a93c44A855E649071F6Eb4C6",
    reputationToken: "0xaB6A64C82C32Cc079B626C1cac5Dce8aa2E3e3EF",
    balancerFactory: "0xd62e60a61F033658fc2D16cb82861e5776d1BFDf",
    marketFactory: "0x9a7c7af945bB7684909732a929F3047Dd984380F",
    ammFactory: "0xf0591767C4F1d47c2746387463De4B91A89231c5",
    theRundownChainlink: "0x30b3533CcfD1637fD0065B359E1289F13246203c",
  },
  31337: {
    collateral: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    reputationToken: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    balancerFactory: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    marketFactory: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
    ammFactory: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
    theRundownChainlink: "0x30b3533CcfD1637fD0065B359E1289F13246203c",
  },
  42: {
    collateral: "0xDc43Dc2241353C957342D124e99dB32616cc43df",
    reputationToken: "0x74a533340ac02E6A5C48899ff3c40283653930f0",
    balancerFactory: "0xF5BDD887D4805e30D090e3Caa7Dbd92D1B17575b",
    marketFactory: "0x4d1B47BA40C7B9F2BdfC436D06F766859d89F34d",
    ammFactory: "0xC51C1F0002A574feA3921C6652DCb0535a26f62F",
    theRundownChainlink: "0x6eCaD861D5d6bf0f0d914a92D9CbdED58C2b04c7",
  },
};
