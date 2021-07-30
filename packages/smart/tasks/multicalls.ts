import { task, types } from "hardhat/config";

import "hardhat/types/config";
import { makeSigner } from "./deploy";
import { AMMFactory__factory, BPool__factory, buildContractInterfaces, ContractInterfaces } from "..";
import { addresses, ChainId } from "../addresses";

task("multicalls", "get total supply for bpool contract")
  .addParam("marketfactoryaddress", "address of market factory contract", undefined, types.string)
  .addParam("marketindex", "market index", undefined, types.int)
  .setAction(
    async ({ marketfactoryaddress, marketindex }: { marketfactoryaddress: string; marketindex: number }, hre) => {
      const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";
      const { ethers } = hre;
      const signer = await makeSigner(hre);
      const network = await ethers.provider.getNetwork();

      const contracts: ContractInterfaces = buildContractInterfaces(signer, network.chainId);
      const { MarketFactories } = contracts as ContractInterfaces;

      const [contract] = MarketFactories.filter(
        (f) => f.marketFactory.address.toLowerCase() === marketfactoryaddress.toLowerCase()
      ).map((f) => f.marketFactory);

      const market = await contract.getMarket(marketindex);
      console.log("getMarket", market);
      const details = await contract.getMarketDetails(marketindex);
      console.log("getMarketDetails", details);

      const networkId = network.chainId as ChainId;
      const addressMapping = addresses[networkId]?.marketFactories.find(
        (m) => m.address.toLowerCase() === marketfactoryaddress.toLowerCase()
      );
      if (!addressMapping) return console.log("Can not find address mapping");

      const ammFactoryContract = AMMFactory__factory.connect(addressMapping.ammFactory, signer);
      const pool = await ammFactoryContract.getPool(marketfactoryaddress, marketindex);
      console.log("amm factory", addressMapping.ammFactory)
      console.log("pool address", pool);

      if (pool === NULL_ADDRESS) return console.log("no balancer pool doesn't exist");

      const bpool = BPool__factory.connect(pool, signer);
      const totalSupply = await bpool.totalSupply();
      console.log("total supply", totalSupply);
    }
  );
