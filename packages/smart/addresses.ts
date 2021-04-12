// This file is updated by deployer.
export interface Addresses {
  collateral: string;
  reputationToken: string;
  balancerFactory: string;
  marketFactory: string;
  ammFactory: string;
  pool: string;
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
    collateral: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    reputationToken: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    balancerFactory: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    marketFactory: "0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e",
    ammFactory: "0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82",
    pool: "0xE451980132E65465d0a498c53f0b5227326Dd73F",
    theRundownChainlink: "0xC6420cCdaf6673216C39f83CfC2f498876CA1d39",
  },
  212984383488152: {
    collateral: "0xe5aa91537A66e884178B2A9faD97afFfe78b5EC5",
    reputationToken: "0xA50667Cf776fcb033001F1ff54fC313E90ABE508",
    balancerFactory: "0x60d10F04E830B5E5430C4e850d43127e893Ac396",
    marketFactory: "0x1a6B0282AfD831aC7872cf61BcF82843B1FB9E2f",
    ammFactory: "0x6662b8850cE9455f1E1dd9A5f65103C0685A0FeE",
    pool: "0xCD5b97f3a8dC61Fa7A44dEf4F3CD3963AcB7c42D",
    theRundownChainlink: "0xC6420cCdaf6673216C39f83CfC2f498876CA1d39",
  },
  80001: {
    collateral: "0x0aE2e61C5f0C5d40a93c44A855E649071F6Eb4C6",
    reputationToken: "0xaB6A64C82C32Cc079B626C1cac5Dce8aa2E3e3EF",
    balancerFactory: "0xd62e60a61F033658fc2D16cb82861e5776d1BFDf",
    marketFactory: "0x9a7c7af945bB7684909732a929F3047Dd984380F",
    ammFactory: "0xf0591767C4F1d47c2746387463De4B91A89231c5",
    pool: "0x59B7b7c91E0C68D12a27098A09eeFbeEA3731cC0",
    theRundownChainlink: "0xC6420cCdaf6673216C39f83CfC2f498876CA1d39",
  },
  42: {
    collateral: "0xc1A3673382Ffe4c76936c1A2d5648E36d96AdcB7",
    reputationToken: "0xA3DF5cC9Fa2f8f02Ec76cea4B482bdf03B98256C",
    balancerFactory: "0xa7b65cB63ffD8842Db61CF575B8A0D994E6EC903",
    marketFactory: "0xcd0CbEb289df6ACac69489659db6B95E0eF1702c",
    ammFactory: "0x5AC17995CF3fe9135500008D35d75a137E752f89",
    pool: "0x1595Ae10Da1A51851c4ae98c29bD44A24369a2fE",
    theRundownChainlink: "0x72d211dCE646eb2c7CEaC1e8E483Ff372437ed50",
  },
};
