import { task, types } from "hardhat/config";

import "hardhat/types/config";
import { buildContractInterfaces, ContractInterfaces, SportsLinkMarketFactory } from "..";
import { makeSigner } from "./deploy";

task("createSportsLinkMarket", "Create market for the SportsLinkMarketFactory")
  .addParam("eventId", undefined, undefined, types.string)
  .addParam("homeTeamId", undefined, undefined, types.string)
  .addParam("awayTeamId", undefined, undefined, types.string)
  .addParam("startTimestamp", undefined, undefined, types.string)
  .addParam("moneylineHome", undefined, undefined, types.string)
  .addParam("moneylineAway", undefined, undefined, types.string)
  .addParam("homeSpread", undefined, undefined, types.string)
  .addParam("totalScore", undefined, undefined, types.string)
  .addParam("createSpread", undefined, undefined, types.boolean)
  .addParam("createTotal", undefined, undefined, types.boolean)
  .addParam("index", "index of market factory to use, in addresses.ts", 0, types.int)

  .setAction(
    async (
      {
        eventId,
        homeTeamId,
        awayTeamId,
        startTimestamp,
        moneylineHome,
        moneylineAway,
        homeSpread,
        totalScore,
        createSpread,
        createTotal,
        index,
      },
      hre
    ) => {
      const { ethers } = hre;

      const signer = await makeSigner(hre);
      const network = await ethers.provider.getNetwork();
      const contracts: ContractInterfaces = buildContractInterfaces(signer, network.chainId);
      const { MarketFactories } = contracts;
      const marketFactory = MarketFactories[index].marketFactory as SportsLinkMarketFactory;

      console.log("Creating market");
      await marketFactory.createMarket(
        eventId,
        homeTeamId,
        awayTeamId,
        startTimestamp,
        [moneylineHome, moneylineAway],
        homeSpread,
        totalScore,
        createSpread,
        createTotal
      );
    }
  );
