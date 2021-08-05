import { task, types } from "hardhat/config";

import "hardhat/types/config";
import { buildContractInterfaces, ContractInterfaces, CryptoMarketFactory } from "..";
import { makeSigner } from "./deploy";
import { getUpcomingFriday4pmEst } from "../src";

task("createCryptoMarkets", "Create market for the CryptoMarketFactory")
  .addParam("index", "index of market factory to use, in addresses.ts", 0, types.int)

  .setAction(
    async (
      { eventId, homeTeamId, awayTeamId, startTimestamp, homeSpread, totalScore, createSpread, createTotal, index },
      hre
    ) => {
      const { ethers } = hre;

      const signer = await makeSigner(hre);
      const network = await ethers.provider.getNetwork();
      const contracts: ContractInterfaces = buildContractInterfaces(signer, network.chainId);
      const { MarketFactories } = contracts;
      const marketFactory = MarketFactories[index].marketFactory as CryptoMarketFactory;

      console.log("Creating and resolving markets");
      await marketFactory.createAndResolveMarkets([0, 0, 0, 0, 0, 0], getUpcomingFriday4pmEst().valueOf());
    }
  );
