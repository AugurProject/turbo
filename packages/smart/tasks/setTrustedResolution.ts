import { task, types } from "hardhat/config";

import "hardhat/types/config";
import { buildContractInterfaces, ContractInterfaces, SportsLinkMarketFactory } from "..";
import { makeSigner } from "./deploy";
import { sleep, SportsLinkEventStatus } from "../src";

task("setTrustedResolution", "Set market resolution for the TrustedMarketFactory")
  .addParam("marketid", undefined, undefined, types.int)
  .addParam("eventid", undefined, undefined, types.string)
  .addParam("homescore", undefined, undefined, types.int)
  .addParam("awayscore", undefined, undefined, types.int)
  .setAction(async ({ marketid, eventid, homescore, awayscore }, hre) => {
    const { ethers } = hre;

    const signer = await makeSigner(hre);
    const network = await ethers.provider.getNetwork();
    const contracts: ContractInterfaces = buildContractInterfaces(signer, network.chainId);
    const { MarketFactories } = contracts;
    const marketFactory = MarketFactories["sportsball"] as SportsLinkMarketFactory;
    await marketFactory.trustedResolveMarkets(
      await marketFactory.encodeResolution(eventid, SportsLinkEventStatus.Final, homescore, awayscore)
    );
    await sleep(10000);
    const market = await marketFactory.getMarket(marketid);
    console.log(`Set trusted resolution: ${market.winner}`);
  });
