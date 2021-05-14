import { task, types } from "hardhat/config";

import "hardhat/types/config";
import { buildContractInterfaces, ContractInterfaces, SportsLinkMarketFactory } from "..";
import { makeSigner } from "./deploy";

task("createSportsLinkMarket", "Create market for the SportsLinkMarketFactory")
  .addParam("eventId", undefined, undefined, types.string)
  .addParam("homeTeamId", undefined, undefined, types.string)
  .addParam("awayTeamId", undefined, undefined, types.string)
  .addParam("startTimestamp", undefined, undefined, types.string)
  .addParam("homeSpread", undefined, undefined, types.string)
  .addParam("totalScore", undefined, undefined, types.string)
  .addParam("createSpread", undefined, undefined, types.boolean)
  .addParam("createTotal", undefined, undefined, types.boolean)
  .setAction(
    async (
      { eventId, homeTeamId, awayTeamId, startTimestamp, homeSpread, totalScore, createSpread, createTotal },
      hre
    ) => {
      const { ethers } = hre;

      const signer = await makeSigner(hre);
      const network = await ethers.provider.getNetwork();
      const contracts: ContractInterfaces = buildContractInterfaces(signer, network.chainId);
      const { MarketFactories } = contracts;
      const marketFactory = MarketFactories["sportsball"] as SportsLinkMarketFactory;

      const payload = await marketFactory.encodeCreation(
        eventId,
        homeTeamId,
        awayTeamId,
        startTimestamp,
        homeSpread,
        totalScore,
        createSpread,
        createTotal
      );
      console.log("Creating market");
      await marketFactory.createMarket(payload);
    }
  );
