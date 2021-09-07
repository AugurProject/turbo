import { task, types } from "hardhat/config";

import "hardhat/types/config";
import { buildContractInterfaces, ContractInterfaces, SportsLinkMarketFactoryV2, MMAMarketFactory } from "..";
import { makeSigner } from "./deploy";

task("createMarket", "Create market for the SportsLinkMarketFactory")
  .addParam("eventid", undefined, undefined, types.string)
  .addParam("hometeamid", undefined, undefined, types.string)
  .addParam("awayteamid", undefined, undefined, types.string)
  .addParam("awayteamname", undefined, undefined, types.string)
  .addParam("moneylinehome", undefined, undefined, types.string)
  .addParam("moneylineaway", undefined, undefined, types.string)
  .addParam("hometeamname", undefined, undefined, types.string)
  .addParam("starttimestamp", undefined, undefined, types.string)
  .addParam("index", "index of market factory to use, in addresses.ts", 0, types.int)

  .setAction(
    async (
      {
        eventid,
        hometeamname,
        hometeamid,
        awayteamname,
        awayteamid,
        starttimestamp,
        moneylinehome,
        moneylineaway,
        index,
      },
      hre
    ) => {
      const { ethers } = hre;

      const signer = await makeSigner(hre);
      const network = await ethers.provider.getNetwork();
      const contracts: ContractInterfaces = buildContractInterfaces(signer, network.chainId);
      const { MarketFactories } = contracts;

      console.log(MarketFactories.map(v => ({x: v.marketFactory.address })))
      const marketFactory = MarketFactories[index].marketFactory as MMAMarketFactory;
      console.log("Creating market...");
      const tx = await marketFactory.createEvent(
        eventid,
        hometeamname,
        hometeamid,
        awayteamname,
        awayteamid,
        starttimestamp,
        [moneylinehome, moneylineaway]
      );
      console.log(`Finished at ${tx.hash}`)
    }
  );
