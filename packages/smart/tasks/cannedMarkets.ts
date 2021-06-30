import { task } from "hardhat/config";
import { buildContractInterfaces, ContractInterfaces, MarketFactoryType } from "..";
import { SportsLinkMarketFactory, MMALinkMarketFactory } from "../typechain";
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

  const sportsLinkMarkets = [
    { eventId: "0xaf2a", homeId: 0x1, awayId: 0x2, spread: -50, ou: 2000 },
    { eventId: "0xa1123c", homeId: 0x30, awayId: 0x2f, spread: -30, ou: 300 },
    { eventId: "0xb2011c", homeId: 0x51, awayId: 0x52, spread: 10, ou: 500 },
    { eventId: "0xc3444c", homeId: 0x66, awayId: 0x65, spread: -30, ou: 30 },
    { eventId: "0x12f001", homeId: 0x67, awayId: 0x68, spread: 0, ou: 10 },
  ];

  for (const { eventId, homeId, awayId, spread, ou } of sportsLinkMarkets) {
    console.log("Creating market:");
    console.log(`    Event ID: ${eventId}`);
    console.log(`    Home ID: ${homeId}`);
    console.log(`    Away ID: ${awayId}`);
    const startTime = BigNumber.from(Date.now())
      .div(1000)
      .add(60 * 5); // 5 minutes from now
    const marketFactory = MarketFactories[marketFactoryIndex(contracts, "SportsLink")]
      .marketFactory as SportsLinkMarketFactory;
    await createSportsLinkMarket(signer, marketFactory, startTime, eventId, homeId, awayId, spread, ou, confirmations);
    const marketCount = await marketFactory.marketCount().then((bn) => bn.toNumber());
    const [m1, m2, m3] = [marketCount - 1, marketCount - 2, marketCount - 3];
    console.log(`Created markets ${m3}, ${m2}, ${m1} for SportsLink ${marketFactory.address}`);
  }

  const mmaLinkMarkets = [
    {
      eventId: "0x9b5ce",
      homeName: "Godzilla",
      homeId: 0x55,
      awayName: "Mothra",
      awayId: 0x78,
      moneylineHome: -40,
      moneylineAway: 80,
    },
  ];

  for (const { eventId, homeName, homeId, awayName, awayId, moneylineHome, moneylineAway } of mmaLinkMarkets) {
    console.log("Creating market:");
    console.log(`    Event ID: ${eventId}`);
    console.log(`    Home: ${homeName} (${homeId})`);
    console.log(`    Away: ${awayName} (${awayId})`);
    const startTime = BigNumber.from(Date.now())
      .div(1000)
      .add(60 * 5); // 5 minutes from now
    const marketFactory = MarketFactories[marketFactoryIndex(contracts, "MMALink")]
      .marketFactory as MMALinkMarketFactory;
    await createMMALinkMarket(
      signer,
      marketFactory,
      startTime,
      eventId,
      homeName,
      homeId,
      awayName,
      awayId,
      moneylineHome,
      moneylineAway,
      confirmations
    );
    const marketId = await marketFactory.marketCount().then((bn) => bn.toNumber() - 1);
    console.log(`Created market ${marketId} for MMALink market ${marketFactory.address}`);
  }
});

export async function createSportsLinkMarket(
  signer: Signer,
  marketFactory: SportsLinkMarketFactory,
  startTime: BigNumberish,
  eventId: BigNumberish,
  homeId: BigNumberish,
  awayId: BigNumberish,
  homeSpreadTarget: BigNumberish,
  overUnderTarget: BigNumberish,
  confirmations: number
) {
  return marketFactory
    .createMarket(eventId, homeId, awayId, startTime, homeSpreadTarget, overUnderTarget, true, true)
    .then((tx: ContractTransaction) => tx.wait(confirmations));
}

export async function createMMALinkMarket(
  signer: Signer,
  marketFactory: MMALinkMarketFactory,
  startTime: BigNumberish,
  eventId: BigNumberish,
  homeName: string,
  homeId: BigNumberish,
  awayName: string,
  awayId: BigNumberish,
  moneylineHome: BigNumberish,
  moneylineAway: BigNumberish,
  confirmations: number
) {
  return marketFactory
    .createMarket(eventId, homeName, homeId, awayName, awayId, startTime, [moneylineHome, moneylineAway])
    .then((tx: ContractTransaction) => tx.wait(confirmations));
}

// Finds the first instance of the market factory of the give type and returns its index.
// Since the first instance is the latest to be deployed, this returned the most recently-deployed market factory of the type.
function marketFactoryIndex(contracts: ContractInterfaces, ofType: MarketFactoryType): number {
  const { MarketFactories } = contracts;
  return MarketFactories.findIndex(({ marketFactoryType }) => marketFactoryType === ofType);
}
