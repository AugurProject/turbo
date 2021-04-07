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
    collateral: "0xebE8426496709B416fbf642323E2D9da176078B1",
    reputationToken: "0xdB5436660459867e4704465D1A24564900b24336",
    balancerFactory: "0x6Ae3a6B297Cd0d3008747C4dE1DEEDF58EbA4423",
    hatcheryRegistry: "0x40e183a9A7c2D15Ca32132135a415724e9AD079B",
    hatchery: "0x83a15caF6BEC6188714faBc780eAFccBf522E22a",
    arbiter: "0xb244cA7f8928451023C437Fd9407679FF30D6373",
    ammFactory: "0xBcD25aF3D7D10506727FF5c6c7a47fdE93Ad3693",
    pool: "0xe760688E9476cBdABA1b292e9A07bF98b713d775",
    theRundownChainlink: "0xe7db9D34Df0612cd3104B46596E27904930Eb967",
  },
};
