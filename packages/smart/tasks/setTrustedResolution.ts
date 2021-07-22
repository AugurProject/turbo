import { task, types } from "hardhat/config";

import "hardhat/types/config";
import { buildContractInterfaces, ContractInterfaces, SportsLinkMarketFactoryV2 } from "..";
import { makeSigner } from "./deploy";
import { sleep } from "../src";

task("setTrustedResolution", "Set market resolution for the TrustedMarketFactory")
  .addParam("market", undefined, undefined, types.int)
  .addParam("outcomes", undefined, undefined, types.json)
  .addParam("index", "index of market factory to use, in addresses.ts", 0, types.int)
  .setAction(async ({ turbo: marketId, outcomes, index }, hre) => {
    if (!Array.isArray(outcomes) || outcomes.some(isNaN))
      throw Error(`Outcomes must be an array of strings that represent numbers, not ${outcomes}`);
    const { ethers } = hre;

    const signer = await makeSigner(hre);
    const network = await ethers.provider.getNetwork();
    const contracts: ContractInterfaces = buildContractInterfaces(signer, network.chainId);
    const { MarketFactories } = contracts;
    const marketFactory = MarketFactories[index].marketFactory as SportsLinkMarketFactoryV2;
    await marketFactory.trustedSetResolution(marketId, outcomes);
    await sleep(10000);
    const market = await marketFactory.getMarket(marketId);
    console.log(`Set trusted resolution: ${market.winner}`);
  });
