import { task, types } from "hardhat/config";

import "hardhat/types/config";
import { AbstractMarketFactoryV2, buildContractInterfaces, ContractInterfaces } from "..";
import { makeSigner } from "./deploy";

task("setOwner", "Set owner for market factory")
  .addParam("address", "new link node address", undefined, types.string)
  .addParam("index", "index of market factory to use, in addresses.ts", undefined, types.int)
  .setAction(async ({ address, index }, hre) => {
    const { ethers } = hre;

    const signer = await makeSigner(hre);
    const network = await ethers.provider.getNetwork();
    const contracts: ContractInterfaces = buildContractInterfaces(signer, network.chainId);
    const { MarketFactories } = contracts;
    const marketFactory = (MarketFactories[index].marketFactory as unknown) as AbstractMarketFactoryV2;

    const originalOwner = await marketFactory.getOwner();

    if (originalOwner === address) {
      console.log(`Owner is already "${address}" so no need to change it.`);
    } else {
      console.log(`Changing owner from "${originalOwner}" to "${address}".`);
      await marketFactory.transferOwnership(address);
    }
  });
