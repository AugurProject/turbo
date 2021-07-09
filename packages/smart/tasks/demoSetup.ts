import { task } from "hardhat/config";
import {
  AbstractMarketFactory,
  AMMFactory,
  buildContractInterfaces,
  Cash,
  Cash__factory,
  ContractInterfaces,
  MarketFactoryType,
} from "../index";
import { SportsLinkMarketFactory } from "../typechain";
import { isHttpNetworkConfig, makeSigner } from "./deploy";
import { BigNumber, BigNumberish, ContractTransaction, Signer } from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";

task("demoSetup", "creates markets and such for a demo").setAction(async (args, hre: HardhatRuntimeEnvironment) => {
  const { signer, contracts, confirmations } = await setup(hre);

  const factoryContracts = contracts.MarketFactories[marketFactoryIndex(contracts, "SportsLink")];
  const marketFactory = factoryContracts.marketFactory as SportsLinkMarketFactory;
  const ammFactory = factoryContracts.ammFactory;
  const collateral = Cash__factory.connect(factoryContracts.collateral.address, signer);

  await createMarkets(EVENTS, marketFactory, signer, confirmations);
  await addLiquidity(EVENTS, ammFactory, marketFactory, collateral, confirmations);
});

const EVENTS: EventDescription[] = [
  {
    description: "American League vs National League on July 13th 7:30 pm ET",
    eventId: "0x14a6ded9358233",
    homeId: 1801,
    awayId: 1802,
    startTime: Date.parse("13 Jul 2021 19:30:00 EDT"),
    initialLiquidity: dollars(100000),
  },
  {
    description: "Red Sox vs Yankees on July 15th, starts at 7:08 pm ET",
    eventId: "0x5555555555555a",
    homeId: 10,
    awayId: 24,
    startTime: Date.parse("15 Jul 2021 19:08:00 EDT"),
    initialLiquidity: dollars(75000),
  },
  {
    // Who Will win the NBA Finals?
    //
    //
    // No Contest
    description: "NBA Finals: Milwaukee Bucks vs Phoenix Suns on July 11th, starts at 8:00 pm ET",
    eventId: "0x124578124578eee",
    homeId: 1000000,
    awayId: 1000001,
    startTime: Date.parse("11 Jul 2021 20:00:00 EDT"),
    initialLiquidity: dollars(42000),
  },
];

interface EventDescription {
  description?: string;
  eventId: string;
  homeId: number;
  awayId: number;
  startTime: number; // seconds since epoch
  initialLiquidity: BigNumberish;
}

async function createMarkets(
  eventDescriptions: EventDescription[],
  marketFactory: SportsLinkMarketFactory,
  signer: Signer,
  confirmations: number
): Promise<number[]> {
  const originalLinkNode = await handleLinkNode(marketFactory, signer);
  const originalMarketCount = await getMarketCount(marketFactory);

  console.log(`Creating markets for factory ${marketFactory.address}`);
  try {
    for (const eventDescription of eventDescriptions) {
      await createMarket(eventDescription, signer, marketFactory, confirmations);
    }
  } finally {
    await resetLinkNode(marketFactory, originalLinkNode);
  }

  const finalMarketCount = await getMarketCount(marketFactory);
  const marketIds = listCreatedMarkets(originalMarketCount, finalMarketCount);

  if (marketIds.length > 0) {
    console.log(`Created markets for SportsLinkMarketFactory ${marketFactory.address}: ${marketIds.join(", ")}`);
  } else {
    console.log(`Created no markets for SportsLinkMarketFactory ${marketFactory.address} because they already existed`);
  }

  return marketIds;
}

async function createMarket(
  eventDescription: EventDescription,
  signer: Signer,
  marketFactory: SportsLinkMarketFactory,
  confirmations: number
) {
  const { eventId, homeId, awayId, startTime } = eventDescription;

  const exists = await eventExists(marketFactory, eventId);

  if (exists) {
    console.log(`Skipping creation of markets for ${eventId} because it already has at least one market`);
    return;
  }

  console.log("Creating market:");
  console.log(`    Event ID: ${eventId}`);
  console.log(`    Start Time: ${startTime}`);
  console.log(`    Home ID: ${homeId}`);
  console.log(`    Away ID: ${awayId}`);

  await marketFactory
    .createMarket(eventId, homeId, awayId, startTime, 0, 0, false, false)
    .then((tx: ContractTransaction) => tx.wait(confirmations));
}

async function addLiquidity(
  eventDescriptions: EventDescription[],
  ammFactory: AMMFactory,
  marketFactory: SportsLinkMarketFactory,
  collateral: Cash,
  confirmations: number
) {
  console.log(`Adding liquidity for demo markets`);
  for (const eventDescription of eventDescriptions) {
    await addLiquidityForEvent(eventDescription, ammFactory, marketFactory, collateral, confirmations);
  }
}

async function addLiquidityForEvent(
  eventDescription: EventDescription,
  ammFactory: AMMFactory,
  marketFactory: SportsLinkMarketFactory,
  collateral: Cash,
  confirmations: number
) {
  const { eventId, initialLiquidity } = eventDescription;
  const [marketId] = await getEventMarkets(marketFactory, eventId);

  const exists = await poolExists(ammFactory, marketFactory, marketId);

  if (exists) {
    console.log(`Skipping liquidity adding for ${marketFactory}-${marketId.toString()} because it already has a pool`);
    return;
  }

  await collateral.faucet(initialLiquidity);
  await collateral.approve(ammFactory.address, initialLiquidity);

  const lpTokenRecipient = await marketFactory.signer.getAddress();
  const weights = calcWeights([2, 49, 49]);

  console.log(`Adding liquidity to ${marketFactory.address}-${marketId.toString()}`);
  await ammFactory
    .createPool(marketFactory.address, marketId, initialLiquidity, weights, lpTokenRecipient)
    .then((tx) => tx.wait(confirmations));
}

//
// HELPERS
//

async function getMarketCount(marketFactory: SportsLinkMarketFactory): Promise<number> {
  return marketFactory.marketCount().then((bn) => bn.toNumber());
}

function listCreatedMarkets(originalMarketCount: number, finalMarketCount: number) {
  const marketIds = [];
  for (let i = originalMarketCount; i < finalMarketCount; i++) {
    marketIds.push(i);
  }
  return marketIds;
}

// Finds the first instance of the market factory of the give type and returns its index.
// Since the first instance is the latest to be deployed, this returned the most recently-deployed market factory of the type.
function marketFactoryIndex(contracts: ContractInterfaces, ofType: MarketFactoryType): number {
  const { MarketFactories } = contracts;
  return MarketFactories.findIndex(({ marketFactoryType }) => marketFactoryType === ofType);
}

// Returns string if the link node needs to be reset afterwards.
interface ControllableLinkMarketFactory {
  linkNode(): Promise<string>;
  setLinkNode(address: string): Promise<any>;
  getOwner(): Promise<string>;
}

async function handleLinkNode(marketFactory: ControllableLinkMarketFactory, signer: Signer): Promise<string | null> {
  const originalLinkNode = await marketFactory.linkNode().then((a) => a.toLowerCase());
  const owner = await marketFactory.getOwner().then((a) => a.toLowerCase());
  const me = await signer.getAddress().then((a) => a.toLowerCase());
  const mustSetLinkNode = originalLinkNode !== me;

  if (mustSetLinkNode && owner !== me) {
    throw Error(
      `Cannot create canned markets because you aren't the owner nor the link node. you=${me}, owner=${owner}, linkNode=${originalLinkNode}`
    );
  }

  if (mustSetLinkNode) {
    console.log(`Temporarily changing link node from ${originalLinkNode} to ${me}`);
    await marketFactory.setLinkNode(me);
    return originalLinkNode;
  } else {
    return null;
  }
}

async function resetLinkNode(
  marketFactory: ControllableLinkMarketFactory,
  originalLinkNode: string | null
): Promise<void> {
  if (originalLinkNode) {
    console.log(`Setting the link node back to ${originalLinkNode}`);
    await marketFactory.setLinkNode(originalLinkNode);
  }
}

async function getEventMarkets(marketFactory: SportsLinkMarketFactory, eventId: BigNumberish): Promise<BigNumber[]> {
  return marketFactory.getEventMarkets(eventId).then((ids) => ids.filter((id) => !id.isZero()));
}

async function eventExists(marketFactory: SportsLinkMarketFactory, eventId: BigNumberish): Promise<boolean> {
  const marketIds = await getEventMarkets(marketFactory, eventId);
  return marketIds.length > 0;
}

async function poolExists(ammFactory: AMMFactory, marketFactory: SportsLinkMarketFactory, marketId: BigNumberish) {
  const pool = await ammFactory.getPool(marketFactory.address, marketId);
  return !BigNumber.from(pool).eq(0);
}

function dollars(howManyDollars: number): BigNumber {
  const basis = BigNumber.from(10).pow(6);
  return basis.mul(howManyDollars);
}

function calcWeights(ratios: number[]): BigNumber[] {
  const basis = BigNumber.from(10).pow(18);
  const total = ratios.reduce((total, x) => total + x, 0);
  const max = basis.mul(50);
  const factor = max.div(total); // TODO this doesn't work if total is too large
  return ratios.map((r) => factor.mul(r));
}

async function setup(hre: HardhatRuntimeEnvironment) {
  const { ethers } = hre;
  const signer = await makeSigner(hre);
  const confirmations = isHttpNetworkConfig(hre.network.config) ? hre.network.config.confirmations : 0;
  const network = await ethers.provider.getNetwork();
  const contracts = buildContractInterfaces(signer, network.chainId);
  return { ethers, signer, confirmations, network, contracts };
}
