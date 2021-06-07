import { task } from "hardhat/config";
import { buildContractInterfaces, ContractInterfaces } from "..";
import { SportsLinkMarketFactory } from "../typechain";
import { isHttpNetworkConfig, makeSigner } from "./deploy";
import { BigNumber, BigNumberish, ContractTransaction, Signer } from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";

task("cannedMarkets", "creates canned markets").setAction(async (args, hre: HardhatRuntimeEnvironment) => {
  console.log("Creating canned markets");
  const { ethers } = hre;
  const signer = await makeSigner(hre);
  const network = await ethers.provider.getNetwork();
  const contracts: ContractInterfaces = buildContractInterfaces(signer, network.chainId);
  const { MarketFactories } = contracts;
  const confirmations = isHttpNetworkConfig(hre.network.config) ? hre.network.config.confirmations : 0;

  const markets = [
    { eventId: "0xaf2a", homeId: 0x1, awayId: 0x2, spread: -50, ou: 2000 },
    { eventId: "0xa1123c", homeId: 0x30, awayId: 0x2f, spread: -30, ou: 300 },
    { eventId: "0xb2011c", homeId: 0x51, awayId: 0x52, spread: 10, ou: 500 },
    { eventId: "0xc3444c", homeId: 0x66, awayId: 0x65, spread: -30, ou: 30 },
    { eventId: "0x12f001", homeId: 0x67, awayId: 0x68, spread: 0, ou: 10 },
  ];

  for (const { eventId, homeId, awayId, spread, ou } of markets) {
    console.log("Creating market:");
    console.log(`    Event ID: ${eventId}`);
    console.log(`    Home ID: ${homeId}`);
    console.log(`    Away ID: ${awayId}`);
    const startTime = BigNumber.from(Date.now())
      .div(1000)
      .add(60 * 5); // 5 minutes from now
    const marketFactory = MarketFactories["sportsball"] as SportsLinkMarketFactory;
    await createMarket(signer, marketFactory, startTime, eventId, homeId, awayId, spread, ou, confirmations);
    console.log(`Created head-to-head market`);
    console.log(`Created spread market`);
    console.log(`Created over-under market`);
  }
});

export async function createMarket(
  signer: Signer,
  marketFactory: SportsLinkMarketFactory,
  startTime: BigNumberish,
  eventId: BigNumberish,
  homeId: BigNumberish,
  awayId: BigNumberish,
  homeSpreadTarget: BigNumberish,
  overUnderTarget: BigNumberish,
  confirmations: number
): Promise<void> {
  const result = await marketFactory
    .createMarket(
      await marketFactory.callStatic.encodeCreation(
        eventId,
        homeId,
        awayId,
        startTime,
        homeSpreadTarget,
        overUnderTarget,
        true,
        true
      )
    )
    .then((tx: ContractTransaction) => tx.wait(confirmations));
  console.log("result", result);

  return;
}
