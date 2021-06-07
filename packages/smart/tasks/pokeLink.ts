import { task, types } from "hardhat/config";
import { buildContractInterfaces, ContractInterfaces } from "..";
import { SportsLinkMarketFactory } from "../typechain";
import { makeSigner } from "./deploy";
import { HardhatRuntimeEnvironment } from "hardhat/types";

task("pokeLinkCreateMLB", "create MLB markets")
  .addParam("index", "index of market factory to use, in addresses.ts", 0, types.int)
  .setAction(async ({ index }, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const signer = await makeSigner(hre);
    const network = await ethers.provider.getNetwork();
    const contracts: ContractInterfaces = buildContractInterfaces(signer, network.chainId);

    const { MarketFactories } = contracts;

    const marketFactory = MarketFactories[index].marketFactory as SportsLinkMarketFactory;

    console.log("Poking sports market factory to create new markets for MLB");
    const response = await marketFactory.pokeMarketCreatorMLB();
    console.log(await response.wait());
  });
