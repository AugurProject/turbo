import { task, types } from "hardhat/config";

import "hardhat/types/config";
import { buildContractInterfaces, ContractInterfaces, SportsLinkMarketFactoryV2 } from "..";
import { makeSigner } from "./deploy";

task("setSportsLinkNode", "Set linkNode for SportsLinkMarketFactory")
  .addParam("address", "new link node address", undefined, types.string)
  .addParam("index", "index of market factory to use, in addresses.ts", undefined, types.int)
  .setAction(async ({ address, index }, hre) => {
    const { network } = hre;

    const signer = await makeSigner(hre);
    const contracts: ContractInterfaces = buildContractInterfaces(signer, network.name);
    const { MarketFactories } = contracts;
    const marketFactory = MarketFactories[index].marketFactory as SportsLinkMarketFactoryV2;

    const originalLinkNode = await marketFactory.linkNode();

    if (originalLinkNode === address) {
      console.log(`Link node is already "${address}" so no need to change it.`);
    } else {
      console.log(`Changing link node from "${originalLinkNode}" to "${address}".`);
      await marketFactory.setLinkNode(address);
    }
  });
