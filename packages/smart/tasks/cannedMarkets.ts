import { task } from "hardhat/config";
import { buildContractInterfaces, ContractInterfaces, SportsLinkMarketFactory__factory } from "..";
import { isHttpNetworkConfig, makeSigner } from "./deploy";
import { BigNumber, BigNumberish, ContractTransaction, Signer } from "ethers";

task("cannedMarkets", "creates canned markets").setAction(async (args, hre) => {
  console.log("Creating canned markets");
  const { ethers } = hre;
  const signer = await makeSigner(hre);
  const network = await ethers.provider.getNetwork();
  const contracts: ContractInterfaces = buildContractInterfaces(signer, network.chainId);
  const { MarketFactory: marketFactory } = contracts;
  const confirmations = isHttpNetworkConfig(hre.network.config) ? hre.network.config.confirmations : 0;

  const markets = [
    { eventId: 0xf2, homeId: 0x1, awayId: 0x2 },
    { eventId: 0x10011101, homeId: 0x3, awayId: 0x4 },
    { eventId: 0x12, homeId: 0x5, awayId: 0x6 },
  ];
  for (const { eventId, homeId, awayId } of markets) {
    console.log("Creating market:");
    console.log(`    Event ID: ${eventId}`);
    console.log(`    Home ID: ${homeId}`);
    console.log(`    Away ID: ${awayId}`);
    const startTime = BigNumber.from(Date.now())
      .div(1000)
      .add(60 * 5); // 5 minutes from now
    const duration = 60 * 60; // one hour
    const endTime = startTime.add(duration);
    const { headToHead, spread, overUnder } = await createMarket(
      signer,
      marketFactory.address,
      startTime,
      endTime,
      eventId,
      homeId,
      awayId,
      5,
      20,
      confirmations
    );
    console.log(`Created head-to-head market: ${headToHead}`);
    console.log(`Created spread market: ${spread}`);
    console.log(`Created over-under market: ${overUnder}`);
  }
});

export async function createMarket(
  signer: Signer,
  marketFactoryAddress: string,
  startTime: BigNumberish,
  endTime: BigNumberish,
  eventId: BigNumberish,
  homeId: BigNumberish,
  awayId: BigNumberish,
  homeSpreadTarget: BigNumberish,
  overUnderTarget: BigNumberish,
  confirmations: number
): Promise<SportsMarkets> {
  const marketFactory = SportsLinkMarketFactory__factory.connect(marketFactoryAddress, signer);
  const creator = await signer.getAddress();

  const [headToHead, spread, overUnder] = await marketFactory.callStatic.createMarket(
    creator,
    endTime,
    eventId,
    homeId,
    awayId,
    homeSpreadTarget,
    overUnderTarget,
    startTime
  );
  await marketFactory
    .createMarket(creator, endTime, eventId, homeId, awayId, homeSpreadTarget, overUnderTarget, startTime)
    .then((tx: ContractTransaction) => tx.wait(confirmations));
  return { headToHead, spread, overUnder };
}

export interface SportsMarkets {
  headToHead: BigNumber;
  spread: BigNumber;
  overUnder: BigNumber;
}
