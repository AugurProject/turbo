import { BigNumberish, BytesLike, ContractTransaction, BigNumber } from "ethers";
import { task } from "hardhat/config";
import { buildContractInterfaces, ContractInterfaces } from "..";
import { MarketTypes } from "../src/utils/constants";
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
  const outcomeSymbols = ["No Contest", "No", "yes"];
  const outcomeNames = outcomeSymbols.map(ethers.utils.formatBytes32String) as BytesLike[];
  const numTicks = 1000;

  const contracts: ContractInterfaces = buildContractInterfaces(signer, network.chainId);
  const { TrustedArbiter, Hatchery } = contracts;
  const index = 42; // arbitrary uint256 for easy log filtering
  const creatorFee = BigNumber.from(10).pow(16).mul(2);
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

  const turboCount = await (await Hatchery.getTurboLength()).sub(1);
  console.log("turbo Count", turboCount);
  const data = await TrustedArbiter.getTurbo(turboCount);
  console.log("data", data);
});
