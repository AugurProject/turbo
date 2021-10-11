import { task, types } from "hardhat/config";

import "hardhat/types/config";
import { AbstractMarketFactoryV2, buildContractInterfaces, ContractInterfaces } from "..";
import { makeSigner } from "./deploy";

task("getOwner", "Set owner for market factory")
  .addParam("index", "index of market factory to use, in addresses.ts", undefined, types.int)
  .setAction(async ({ index }, hre) => {
    const { network } = hre;

    const signer = await makeSigner(hre);
    const contracts: ContractInterfaces = buildContractInterfaces(signer, network.name);
    const { MarketFactories } = contracts;
    const marketFactory = (MarketFactories[index].marketFactory as unknown) as AbstractMarketFactoryV2;

    const owner = await marketFactory.getOwner();
    console.log(`Owner is ${owner}`);
  });
