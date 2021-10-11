import { task, types } from "hardhat/config";

import "hardhat/types/config";
import { buildContractInterfaces, ContractInterfaces, SportsLinkMarketFactoryV2 } from "..";
import { makeSigner } from "./deploy";
import { sleep, SportsLinkEventStatus } from "../src";

task("setSportsLinkResolution", "Set market resolution for the SportsLinkMarketFactory")
  .addParam("marketid", undefined, undefined, types.int)
  .addParam("eventid", undefined, undefined, types.string)
  .addParam("homescore", undefined, undefined, types.int)
  .addParam("awayscore", undefined, undefined, types.int)
  .addParam("index", "index of market factory to use, in addresses.ts", 0, types.int)
  .setAction(async ({ marketid, eventid, homescore, awayscore, index }, hre) => {
    const { network } = hre;

    const signer = await makeSigner(hre);
    const contracts: ContractInterfaces = buildContractInterfaces(signer, network.name);
    const { MarketFactories } = contracts;
    const marketFactory = MarketFactories[index].marketFactory as SportsLinkMarketFactoryV2;
    await marketFactory.resolveEvent(eventid, SportsLinkEventStatus.Final, homescore, awayscore);
    await sleep(10000);
    const market = await marketFactory.getMarket(marketid);
    console.log(`Set trusted resolution: ${market.winner}`);
  });
