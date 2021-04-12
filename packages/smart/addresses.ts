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
  31337: {
    theRundownChainlink: "0xC6420cCdaf6673216C39f83CfC2f498876CA1d39",
    collateral: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    reputationToken: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    balancerFactory: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    marketFactory: "0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e",
    ammFactory: "0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82",
  },
  212984383488152: {
    theRundownChainlink: "0xC6420cCdaf6673216C39f83CfC2f498876CA1d39",
    collateral: "0xe5aa91537A66e884178B2A9faD97afFfe78b5EC5",
    reputationToken: "0xA50667Cf776fcb033001F1ff54fC313E90ABE508",
    balancerFactory: "0x60d10F04E830B5E5430C4e850d43127e893Ac396",
    marketFactory: "0x1a6B0282AfD831aC7872cf61BcF82843B1FB9E2f",
    ammFactory: "0x6662b8850cE9455f1E1dd9A5f65103C0685A0FeE",
  },
  80001: {
    theRundownChainlink: "0xC6420cCdaf6673216C39f83CfC2f498876CA1d39",
    collateral: "0x0aE2e61C5f0C5d40a93c44A855E649071F6Eb4C6",
    reputationToken: "0xaB6A64C82C32Cc079B626C1cac5Dce8aa2E3e3EF",
    balancerFactory: "0xd62e60a61F033658fc2D16cb82861e5776d1BFDf",
    marketFactory: "0x9a7c7af945bB7684909732a929F3047Dd984380F",
    ammFactory: "0xf0591767C4F1d47c2746387463De4B91A89231c5",
  },
  42: {
    collateral: "0x4e4E038716BC34E5BB76DA918090d884A77AF7EC",
    reputationToken: "0x6a78b4ce12d6e64CAB093E2051C8AE241b2dD0AC",
    balancerFactory: "0x8eA342C45c5cfc35e2fCBbe0166ab39F74184153",
    marketFactory: "0xef9Ad0ca0019FdD3dc9860c2C69DdEBE142c20E5",
    ammFactory: "0x90769E370034b5Bf99A0Ad31a6F26B4F5b8274dE",
    theRundownChainlink: "0xD44e0035dcdc87F886eb5D41eBCc4e98F8b1C17C",
  },
};
