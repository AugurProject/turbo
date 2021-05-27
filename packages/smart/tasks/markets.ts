import { task } from "hardhat/config";
import { buildContractInterfaces, ContractInterfaces } from "..";
import { makeSigner } from "./deploy";

task("markets", "retreive markets").setAction(async (args, hre) => {
  console.log("get markets data");
  const { ethers } = hre;
  const signer = await makeSigner(hre);
  const network = await ethers.provider.getNetwork();

  const contracts: ContractInterfaces = buildContractInterfaces(signer, network.chainId);
  const { MarketFactories } = contracts;

  const deferredPromises = Object.entries(MarketFactories).map(
    ([name, { MarketFactory: marketFactory, AMMFactory: ammFactory }]) => async () => {
      const length = await marketFactory.marketCount();
      console.log(`MarketFactory "${name}" has ${length} marktets. They are:`);
      for (let marketId = 0; marketId < Number(length); marketId++) {
        const market = await marketFactory.getMarket(marketId);
        const details = await marketFactory.getMarketDetails(marketId);
        console.log(`MARKET ${marketId}`);
        console.log(market);
        console.log(details);
        console.log("-".repeat(80));
      }
    }
  );

  for (let i = 0; i < deferredPromises.length; i++) await deferredPromises[i]();
});
