import { task, types } from "hardhat/config";

import "hardhat/types/config";
import { AbstractMarketFactoryV2, buildContractInterfaces, ContractInterfaces } from "..";
import { makeSigner } from "./deploy";

task("getOwner", "Set owner for market factory")
  .addParam("index", "index of market factory to use, in addresses.ts", undefined, types.int)
  .setAction(async ({ index }, hre) => {
    const { ethers } = hre;

    const signer = await makeSigner(hre);
    const network = await ethers.provider.getNetwork();
    const contracts: ContractInterfaces = buildContractInterfaces(signer, network.chainId);
    const { MarketFactories } = contracts;
    const marketFactory = (MarketFactories[index].marketFactory as unknown) as AbstractMarketFactoryV2;

    const owner = await marketFactory.getOwner();
    console.log(`Owner is ${owner}`);
  });
