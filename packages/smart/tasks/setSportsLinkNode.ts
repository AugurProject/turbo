import { task, types } from "hardhat/config";

import "hardhat/types/config";
import { buildContractInterfaces, ContractInterfaces, SportsLinkMarketFactory } from "..";
import { makeSigner } from "./deploy";

task("setSportsLinkNode", "Set linkNode for SportsLinkMarketFactory")
  .addParam("address", undefined, undefined, types.string)
  .setAction(async ({ address }, hre) => {
    const { ethers } = hre;

    const signer = await makeSigner(hre);
    const network = await ethers.provider.getNetwork();
    const contracts: ContractInterfaces = buildContractInterfaces(signer, network.chainId);
    const { MarketFactories } = contracts;
    const marketFactory = MarketFactories["sportsball"].marketFactory as SportsLinkMarketFactory;

    console.log(`Setting link node to "${address}"`);
    await marketFactory.setLinkNode(address);
  });
