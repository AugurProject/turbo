import { task, types } from "hardhat/config";

import "hardhat/types/config";
import { buildContractInterfaces, ContractInterfaces, SportsLinkMarketFactory } from "..";
import { makeSigner } from "./deploy";
import { sleep } from "../src";

task("setTrustedResolution", "Set market resolution for the TrustedMarketFactory")
  .addParam("market", undefined, undefined, types.int)
  .addParam("outcomes", undefined, undefined, types.json)
  .setAction(async ({ turbo: marketId, outcomes }, hre) => {
    if (!Array.isArray(outcomes) || outcomes.some(isNaN))
      throw Error(`Outcomes must be an array of strings that represent numbers, not ${outcomes}`);
    const { ethers } = hre;

    const signer = await makeSigner(hre);
    const network = await ethers.provider.getNetwork();
    const contracts: ContractInterfaces = buildContractInterfaces(signer, network.chainId);
    const { MarketFactories } = contracts;
    const marketFactory = MarketFactories["sportsball"].marketFactory as SportsLinkMarketFactory;
    await marketFactory.trustedSetResolution(marketId, outcomes);
    await sleep(10000);
    const market = await marketFactory.getMarket(marketId);
    console.log(`Set trusted resolution: ${market.winner}`);
  });
