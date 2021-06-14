import { task, types } from "hardhat/config";

import "hardhat/types/config";
import { buildContractInterfaces, ContractInterfaces, SportsLinkMarketFactory } from "..";
import { makeSigner } from "./deploy";

task("setSportsLinkNode", "Set linkNode for SportsLinkMarketFactory")
  .addParam("address", "new link node address", undefined, types.string)
  .addParam("index", "index of market factory to use, in addresses.ts", 0, types.int)
  .setAction(async ({ address, index }, hre) => {
    const { ethers } = hre;

    const signer = await makeSigner(hre);
    const network = await ethers.provider.getNetwork();
    const contracts: ContractInterfaces = buildContractInterfaces(signer, network.chainId);
    const { MarketFactories } = contracts;
    const marketFactory = MarketFactories[index].marketFactory as SportsLinkMarketFactory;

    console.log(`Setting link node to "${address}"`);
    await marketFactory.setLinkNode(address);
  });
