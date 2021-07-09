import { task, types } from "hardhat/config";
import { buildContractInterfaces, ContractInterfaces } from "..";
import { makeSigner } from "./deploy";

task("getMarket", "retreive market")
  .addParam("marketFactory", "market factory address", undefined, types.string)
  .addParam("marketId", "index of market in factory", undefined, types.int)
  .setAction(async ({ marketFactory, marketId }: { marketFactory: string; marketId: number }, hre) => {
    console.log(`Getting market data for ${marketFactory}-${marketId}`);

    const { ethers } = hre;
    const signer = await makeSigner(hre);
    const network = await ethers.provider.getNetwork();

    const contracts: ContractInterfaces = buildContractInterfaces(signer, network.chainId);
    const { MarketFactories } = contracts as ContractInterfaces;

    const [contract] = MarketFactories.filter((f) => f.marketFactory.address === marketFactory).map(
      (f) => f.marketFactory
    );

    const info = await contract.getMarket(marketId);
    const details = await contract.getMarketDetails(marketId);

    function printEntry(entry: [string, unknown]): void {
      const [k, v] = entry;
      if (isNaN(Number(k))) {
        console.log(`${k} = ${v}`);
      }
    }

    Object.entries(info).map(printEntry);
    Object.entries(details).map(printEntry);
  });
