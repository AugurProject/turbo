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

  const length = await MarketFactory.marketCount();
  console.log('length', String(length));


  for (let marketId = 0; marketId < length; marketId++) {
    const market = await MarketFactory.getMarket(marketId);
    console.log(market);
  }
});
