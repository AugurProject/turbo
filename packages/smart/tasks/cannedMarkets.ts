import { task } from "hardhat/config";
import { buildContractInterfaces, ContractInterfaces } from "..";
import { SportsLinkMarketFactory } from "../typechain"
import { isHttpNetworkConfig, makeSigner } from "./deploy";
import { BigNumber, BigNumberish, ContractTransaction, Signer } from "ethers";

task("cannedMarkets", "creates canned markets").setAction(async (args, hre) => {
  console.log("Creating canned markets");
  const { ethers } = hre;
  const signer = await makeSigner(hre);
  const network = await ethers.provider.getNetwork();
  const contracts: ContractInterfaces = buildContractInterfaces(signer, network.chainId);
  const { MarketFactories } = contracts;
  const confirmations = isHttpNetworkConfig(hre.network.config) ? hre.network.config.confirmations : 0;

  const markets = [
    { eventId: "0xaf2a", homeId: 0x1, awayId: 0x2, spread: -5, ou: 200 },
    { eventId: "0xa1123c", homeId: 0x30, awayId: 0x2f, spread: -3, ou: 30 },
    { eventId: "0xb2011c", homeId: 0x51, awayId: 0x52, spread: 1, ou: 50 },
    { eventId: "0xc3444c", homeId: 0x66, awayId: 0x65, spread: -3, ou: 3 },
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
      await marketFactory.callStatic.encodeCreation(eventId, homeId, awayId, startTime, homeSpreadTarget, overUnderTarget)
    )
    .then((tx: ContractTransaction) => tx.wait(confirmations));
  console.log("result", result);

  return;
}
