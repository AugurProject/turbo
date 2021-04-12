import { task } from "hardhat/config";
import { buildContractInterfaces, ContractInterfaces } from "..";
import { createMarket } from "../src";
import { isHttpNetworkConfig, makeSigner } from "./deploy";

task("cannedMarkets", "creates canned markets").setAction(async (args, hre) => {
  console.log("creating canned markets");
  const { ethers } = hre;
  const signer = await makeSigner(hre);
  const network = await ethers.provider.getNetwork();
  const contracts: ContractInterfaces = buildContractInterfaces(signer, network.chainId);
  const { MarketFactory } = contracts;
  const duration = 60 * 60; // one hour
  const description = "Here is a Categorical Market";
  const outcomes = ["No Contest", "No", "Yes"];
  const confirmations = isHttpNetworkConfig(hre.network.config) ? hre.network.config.confirmations : 0;

  const marketId = await createMarket(signer, MarketFactory.address, duration, description, outcomes, confirmations);

  console.log(`MarketID: ${marketId}`);
});
