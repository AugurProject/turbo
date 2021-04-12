// This file is updated by deployer.
export interface Addresses {
  collateral: string;
  reputationToken: string;
  balancerFactory: string;
  hatcheryRegistry: string;
  hatchery: string;
  arbiter: string;
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
  212984383488152: {
    collateral: "0x16B94A083Bf4013781a05c0cA5951AFc2B1141D8",
    reputationToken: "0x4A6C1b27E8ab5a76C2D586553f757bB5Bf1fc036",
    balancerFactory: "0xdE72C71D153ef6664d510542633CEB51FbB8A9DB",
    hatcheryRegistry: "0x0aE2e61C5f0C5d40a93c44A855E649071F6Eb4C6",
    hatchery: "0xDaD8B772740196a5256c571d66AA692BEc634A50",
    arbiter: "0xd62e60a61F033658fc2D16cb82861e5776d1BFDf",
    ammFactory: "0xe70ba5Aaa0bcB5CE7E0f0944367628566f73Be13",
    pool: "0x1CaD7b2c36817FDdB51609d9bB735E0127B05A5C",
    theRundownChainlink: "0x0",
  },
  80001: {
    collateral: "0xb23De8157b083eDB941c03be60e1bF37d04b485c",
    reputationToken: "0x63383EF92f32B17C0A566Bce5C3e5aEE671aC47a",
    balancerFactory: "0x66Ce9264E5af0415c0b9c71896A99D476f7c3f6E",
    hatcheryRegistry: "0x513A20aF4721Fc74a9F2a5E1D2Bb979511255552",
    hatchery: "0x73F930196dC32A9d389eC8111720b8aBBEa97465",
    arbiter: "0x799b937040E25bBab622Fb9ACC6865e090fEd6Ca",
    ammFactory: "0x6531D31bf6DC6642D30759DAE5379850d316D29A",
    pool: "0xa64529f50205cECdFaB986852F066e21B8c15258",
    theRundownChainlink: "0x0",
  },
  31337: {
    collateral: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    reputationToken: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    balancerFactory: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    hatcheryRegistry: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
    hatchery: "0xB1eDe3F5AC8654124Cb5124aDf0Fd3885CbDD1F7",
    arbiter: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
    ammFactory: "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
    pool: "0x75537828f2ce51be7289709686A69CbFDbB714F1",
    theRundownChainlink: "0x0",
  },
  42: {
    collateral: "0xF0483192f336F8F892D0aa0e73C5E093372bE98d",
    reputationToken: "0x5Fd40080a9C2EfCb6694b411a703F772928511cE",
    balancerFactory: "0x21D6E8850D8526BEC65c6195210183AFCd29B746",
    hatcheryRegistry: "0x28A375B0a6DFd7de7472Ef0fb127f252a3F51f36",
    hatchery: "0x94a6F974B7cE82A430B216bEAC0C66af9344a245",
    arbiter: "0x3383F55fAf0d53F4872579b5854A88bF9307e33d",
    ammFactory: "0xaB478866F819E5Ce85f0c7eA79a09756ca0e692d",
    pool: "0xE0496397E9ff47E705378EA59917bfD24a36A636",
    theRundownChainlink: "0xC6420cCdaf6673216C39f83CfC2f498876CA1d39",
  },
};
