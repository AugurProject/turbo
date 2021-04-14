import { task } from "hardhat/config";
import { buildContractInterfaces, ContractInterfaces } from "..";
import { makeSigner } from "./deploy";

task("markets", "retreive markets").setAction(async (args, hre) => {
  console.log("get markets data");
  const { ethers } = hre;
  const signer = await makeSigner(hre);
  const network = await ethers.provider.getNetwork();

  const contracts: ContractInterfaces = buildContractInterfaces(signer, network.chainId);
  const { MarketFactory } = contracts;

  for (let marketId = 0; ; marketId++) {
    const market = await MarketFactory.getMarket(marketId);
    if (market.endTime.eq(0)) break;
    console.log(market);
  }
});
