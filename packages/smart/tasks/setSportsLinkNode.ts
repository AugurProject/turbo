import { task, types } from "hardhat/config";

import "hardhat/types/config";
import { buildContractInterfaces, ContractInterfaces } from "..";
import { makeSigner } from "./deploy";
import { SportsLinkMarketFactory } from "../typechain";

task("setSportsLinkNode", "Set linkNode for SportsLinkMarketFactory")
  .addParam("address", undefined, undefined, types.string)
  .setAction(async ({ address }, hre) => {
    const { ethers } = hre;

    const signer = await makeSigner(hre);
    const network = await ethers.provider.getNetwork();
    const contracts: ContractInterfaces = buildContractInterfaces(signer, network.chainId);
    const { MarketFactories } = contracts;
    const marketFactory = MarketFactories["sportsball"].MarketFactory as SportsLinkMarketFactory;

    console.log(`Setting link node to "${address}"`);
    await marketFactory.setLinkNode(address);
  });
