import { task, types } from "hardhat/config";
import { buildContractInterfaces, ContractInterfaces } from "..";
import { SportsLinkMarketFactoryV2 } from "../typechain";
import { makeSigner } from "./deploy";
import { HardhatRuntimeEnvironment } from "hardhat/types";

task("pokeLinkCreateMLB", "create MLB markets")
  .addParam("index", "index of market factory to use, in addresses.ts", 0, types.int)
  .setAction(async ({ index }, hre: HardhatRuntimeEnvironment) => {
    const { ethers, network } = hre;
    const signer = await makeSigner(hre);
    const contracts: ContractInterfaces = buildContractInterfaces(signer, network.name);

    const { MarketFactories } = contracts;

    const marketFactory = MarketFactories[index].marketFactory as SportsLinkMarketFactoryV2;

    console.log("Poking sports market factory to create new markets for MLB");
    const response = await marketFactory.pokeMarketCreatorMLB();
    console.log(await response.wait());
  });
