import { task, types } from "hardhat/config";

import "hardhat/types/config";
import { addresses as allAddresses, ChainId, SportsLinkMarketFactory, SportsLinkProxy__factory } from "..";
import { makeSigner } from "./deploy";
import { sleep, SportsLinkEventStatus } from "../src";

task("replayLinkProxy", "Set market resolution for the SportsLinkMarketFactory")
  .addParam("maxCreationIndex", undefined, undefined, types.int)
  .addParam("maxResolutionIndex", undefined, undefined, types.int)
  .setAction(async ({ maxCreationIndex, maxResolutionIndex }, hre) => {
    const { ethers } = hre;

    const signer = await makeSigner(hre);
    const network = await ethers.provider.getNetwork();

    const addresses = allAddresses[network.chainId as ChainId];
    if (!addresses?.sportsLinkProxy) throw Error("No sports link factory");
    const linkProxy = SportsLinkProxy__factory.connect(addresses.sportsLinkProxy, signer);

    // const i = await linkProxy.creationPayloadsLength();
    //
    //
    // const marketFactory = MarketFactories["sportsball"] as SportsLinkMarketFactory;
    // await marketFactory.trustedResolveMarkets(
    //   await marketFactory.encodeResolution(eventid, SportsLinkEventStatus.Final, homescore, awayscore)
    // );
    // await sleep(10000);
    // const market = await marketFactory.getMarket(marketid);
    // console.log(`Set trusted resolution: ${market.winner}`);
  });
