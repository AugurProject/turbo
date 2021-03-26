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
}
type AddressMapping = {
  [id in ChainId]?: Addresses;
};
export const addresses: AddressMapping = {
  42: {
    collateral: "0x9E545E3C0baAB3E08CdfD552C960A1050f373042",
    reputationToken: "0xa82fF9aFd8f496c3d6ac40E2a0F282E47488CFc9",
    balancerFactory: "0x1613beB3B2C4f22Ee086B2b38C1476A3cE7f78E8",
    hatcheryRegistry: "0x851356ae760d987E095750cCeb3bC6014560891C",
    hatchery: "0xbA94C268049DD87Ded35F41F6D4C7542b4BdB767",
    arbiter: "0x95401dc811bb5740090279Ba06cfA8fcF6113778",
    ammFactory: "0x70e0bA845a1A0F2DA3359C97E0285013525FFC49",
    pool: "0x9467A509DA43CB50EB332187602534991Be1fEa4",
  },
  31337: {
    collateral: "0x40918Ba7f132E0aCba2CE4de4c4baF9BD2D7D849",
    reputationToken: "0xF32D39ff9f6Aa7a7A64d7a4F00a54826Ef791a55",
    balancerFactory: "0xd6e1afe5cA8D00A2EFC01B89997abE2De47fdfAf",
    hatcheryRegistry: "0x99dBE4AEa58E518C50a1c04aE9b48C9F6354612f",
    hatchery: "0xA175211367ea60564e039A6F768f7d7F845513c0",
    arbiter: "0xCA8c8688914e0F7096c920146cd0Ad85cD7Ae8b9",
    ammFactory: "0x5FeaeBfB4439F3516c74939A9D04e95AFE82C4ae",
    pool: "0x4bb279a97dA674b94F5b79c9fE5c44Cf5896DCef",
  },
};
