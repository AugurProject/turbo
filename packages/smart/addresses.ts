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
    hatcheryRegistry: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
    hatchery: "0xB1eDe3F5AC8654124Cb5124aDf0Fd3885CbDD1F7",
    arbiter: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
    ammFactory: "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
    pool: "0x75537828f2ce51be7289709686A69CbFDbB714F1",
  },
  212984383488152: {
    collateral: "0x16B94A083Bf4013781a05c0cA5951AFc2B1141D8",
    reputationToken: "0x4A6C1b27E8ab5a76C2D586553f757bB5Bf1fc036",
    balancerFactory: "0xdE72C71D153ef6664d510542633CEB51FbB8A9DB",
    hatcheryRegistry: "0x0aE2e61C5f0C5d40a93c44A855E649071F6Eb4C6",
    hatchery: "0xDaD8B772740196a5256c571d66AA692BEc634A50",
    arbiter: "0xd62e60a61F033658fc2D16cb82861e5776d1BFDf",
    ammFactory: "0xe70ba5Aaa0bcB5CE7E0f0944367628566f73Be13",
    pool: "0x1CaD7b2c36817FDdB51609d9bB735E0127B05A5C",
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
  },
  42: {
    collateral: "0xa8B96fA03798958c2C7E501da75a648a4Df157F4",
    reputationToken: "0x366E88eCf16cA7FBaDbccD6925DB023e34196f5F",
    balancerFactory: "0x022a2143b21996d0eCC89ad1aafd3620a3145aFe",
    hatcheryRegistry: "0xAdE9FF4DfD41fD9612cd501855fa2f6E892d5df0",
    hatchery: "0x7780D4451DF4C74B8Eda3758AC0A67b62c85A39d",
    arbiter: "0x0e52F44CDB81bD6Caa19dE9C58b1F1421a9a9D28",
    ammFactory: "0x61aF827883852A3177B65418E6f5229AEFc9650d",
    pool: "0x24F786c4C1155d9005f82108840610fEE7AcAd5a",
  },
};
