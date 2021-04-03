import { BigNumberish, BytesLike, ContractTransaction } from "ethers";
import { task } from "hardhat/config";
import { buildContractInterfaces, ContractInterfaces } from "..";
import { MarketTypes } from "../src/util";
import { makeSigner } from "./deploy";

task("cannedMarkets", "creates canned markets").setAction(async (args, hre) => {
  console.log("creating canned markets");
  const { ethers } = hre;
  // determine if contracts have been deployed
  // get turboHatchery to create market on
  // create market
  //const Greeter = await hre.ethers.getContractFactory("Greeter");
  const signer = await makeSigner(hre);
  const network = await ethers.provider.getNetwork();
  const outcomeSymbols = ["Invalid", "No", "yes"];
  const outcomeNames = outcomeSymbols.map(ethers.utils.formatBytes32String) as BytesLike[];
  const numTicks = 1000;

  const contracts: ContractInterfaces = buildContractInterfaces(signer, network.chainId);
  const { TrustedArbiter, Hatchery } = contracts;
  const index = 42; // arbitrary uint256 for easy log filtering
  const creatorFee = "1";
  const startTime: BigNumberish = Math.floor(Date.now() / 1000) + 60;
  const duration: BigNumberish = 60 * 60;
  const extraInfoObj = {
    description: "Here is a Categorical Market",
    details: "market details",
    categories: ["example", "market", "category"],
  };

  const prices: BigNumberish[] = [0, 2000];
  const marketType = MarketTypes.CATEGORICAL;

  const arbiterConfiguration = await TrustedArbiter.encodeConfiguration(
    startTime,
    duration,
    JSON.stringify(extraInfoObj),
    prices,
    marketType
  );

  const response = await Hatchery.createTurbo(
    index,
    creatorFee,
    outcomeSymbols,
    outcomeNames,
    numTicks,
    TrustedArbiter.address,
    arbiterConfiguration
  ).then((tx: ContractTransaction) => {
    return tx.wait();
  });

  if (!response) return;
  if (!response.events) return;
  if (response.events.length === 0) return;
  if (!response.events[0].args) return;
  if (response.events[0].args.length === 0) return;
  const marketId = response.events[0].args[0].toNumber();
  const turbo = await Hatchery.turbos(marketId);
  console.log("turbo", turbo);
  const data = await TrustedArbiter.turboData(marketId);
  console.log("data", data);
});
