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
    theRundownChainlink: "0xcF5D88AFa02bc6D6e27011A4d0e6c7747aEAb3c6",
  },
  212984383488152: {
    theRundownChainlink: "0xC6420cCdaf6673216C39f83CfC2f498876CA1d39",
    collateral: "0xe5aa91537A66e884178B2A9faD97afFfe78b5EC5",
    reputationToken: "0xA50667Cf776fcb033001F1ff54fC313E90ABE508",
    balancerFactory: "0x60d10F04E830B5E5430C4e850d43127e893Ac396",
    marketFactory: "0x1a6B0282AfD831aC7872cf61BcF82843B1FB9E2f",
    ammFactory: "0x6662b8850cE9455f1E1dd9A5f65103C0685A0FeE",
    theRundownChainlink: "0xcF5D88AFa02bc6D6e27011A4d0e6c7747aEAb3c6",

  },
  80001: {
    theRundownChainlink: "0xC6420cCdaf6673216C39f83CfC2f498876CA1d39",
    collateral: "0x0aE2e61C5f0C5d40a93c44A855E649071F6Eb4C6",
    reputationToken: "0xaB6A64C82C32Cc079B626C1cac5Dce8aa2E3e3EF",
    balancerFactory: "0xd62e60a61F033658fc2D16cb82861e5776d1BFDf",
    marketFactory: "0x9a7c7af945bB7684909732a929F3047Dd984380F",
    ammFactory: "0xf0591767C4F1d47c2746387463De4B91A89231c5",
    theRundownChainlink: "0xcF5D88AFa02bc6D6e27011A4d0e6c7747aEAb3c6",
  },
  42: {
    collateral: "0x7b96024A6E2F114FEE767233AEF9dE838D7B16ac",
    reputationToken: "0x06fA4AFFa9b4250f7FC82E3052eF214FB9b6784b",
    balancerFactory: "0x297AE669e7Ef4CD38fd0DB878B369F8091B295D3",
    marketFactory: "0x3215A2E176e0f7C26CC09f562dc11f73F154458e",
    ammFactory: "0x4099f197e9827D52b2F7E1BEF956f07fAcbaeeAD",
    theRundownChainlink: "0xcF5D88AFa02bc6D6e27011A4d0e6c7747aEAb3c6",
  },
};
