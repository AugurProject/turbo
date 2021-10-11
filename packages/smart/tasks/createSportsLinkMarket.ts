import { task, types } from "hardhat/config";

import "hardhat/types/config";
import { buildContractInterfaces, ContractInterfaces, SportsLinkMarketFactoryV2 } from "..";
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
      const { network } = hre;

      const signer = await makeSigner(hre);
      const contracts: ContractInterfaces = buildContractInterfaces(signer, network.name);
      const { MarketFactories } = contracts;
      const marketFactory = MarketFactories[index].marketFactory as SportsLinkMarketFactoryV2;

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
