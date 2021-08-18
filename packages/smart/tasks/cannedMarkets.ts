import { task } from "hardhat/config";
import { buildContractInterfaces, ContractInterfaces, MarketFactoryType, NBAMarketFactory } from "..";
import { MMAMarketFactory } from "../typechain";
import { isHttpNetworkConfig, makeSigner } from "./deploy";
import { BigNumber, ContractTransaction, Signer } from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";

task("cannedMarkets", "creates canned markets").setAction(async (args, hre: HardhatRuntimeEnvironment) => {
  console.log("Creating canned markets");
  const { ethers } = hre;
  const signer = await makeSigner(hre);
  const confirmations = isHttpNetworkConfig(hre.network.config) ? hre.network.config.confirmations : 0;
  const network = await ethers.provider.getNetwork();
  const contracts: ContractInterfaces = buildContractInterfaces(signer, network.chainId);

  await nba(signer, contracts, confirmations);
  await nfl(signer, contracts, confirmations);
  await mma(signer, contracts, confirmations);
});

async function nfl(signer: Signer, contracts: ContractInterfaces, confirmations: number) {
  const events: SportsSpecifierThreeLines[] = [
    {
      id: "0xbbb0001",
      home: { id: 0x1, name: "Bobs" },
      away: { id: 0x2, name: "Alices" },
      lines: { spread: -40, ou: 80, h2h: [-100, +500] },
    },
    {
      id: "0xbbb0002",
      home: { id: 0x11, name: "Barbarians" },
      away: { id: 0x12, name: "Sorcerers" },
      lines: { spread: 90, ou: 1000, h2h: [50, -200] },
    },
  ];

  return sport3(signer, contracts, confirmations, events, "NFL");
}

async function nba(signer: Signer, contracts: ContractInterfaces, confirmations: number) {
  const events: SportsSpecifierThreeLines[] = [
    {
      id: "0xbbb00a1",
      home: { id: 0x61, name: "Torpedos" },
      away: { id: 0x62, name: "Missiles" },
      lines: { spread: -40, ou: 80, h2h: [-100, +500] },
    },
    {
      id: "0xbbb00a2",
      home: { id: 0x611, name: "Swords" },
      away: { id: 0x612, name: "Lances" },
      lines: { spread: 90, ou: 1000, h2h: [50, -200] },
    },
  ];

  return sport3(signer, contracts, confirmations, events, "NBA");
}

async function mma(signer: Signer, contracts: ContractInterfaces, confirmations: number) {
  const events: SportsSpecifierOneLine[] = [
    {
      id: "0xbbb00a1",
      home: { id: 0x61, name: "Torpedos" },
      away: { id: 0x62, name: "Missiles" },
      lines: { h2h: [-100, +500] },
    },
    {
      id: "0xbbb00a2",
      home: { id: 0x611, name: "Swords" },
      away: { id: 0x612, name: "Lances" },
      lines: { h2h: [50, -200] },
    },
  ];

  return sport1(signer, contracts, confirmations, events, "MMA");
}

interface SportSpecifier {
  id: string;
  home: { id: number; name: string };
  away: { id: number; name: string };
}

interface SportsSpecifierOneLine extends SportSpecifier {
  lines: OneLine;
}
interface SportsSpecifierThreeLines extends SportSpecifier {
  lines: ThreeLines;
}

interface OneLine {
  h2h: [number, number];
}

interface ThreeLines extends OneLine {
  spread: number;
  ou: number;
}

// Handles any post-refactor sport with 3 markets (h2h, spread, O/U).
// So not SportsLink, MMA, or MLB. Works for NFL, NBA, MLB.
async function sport3(
  signer: Signer,
  contracts: ContractInterfaces,
  confirmations: number,
  events: SportsSpecifierThreeLines[],
  marketType: MarketFactoryType
) {
  const marketFactory = contracts.MarketFactories[marketFactoryIndex(contracts, marketType)]
    .marketFactory as NBAMarketFactory; // NBA market factory interface works for the other 3-sports too

  const originalLinkNode = await handleLinkNode(marketFactory, signer);

  try {
    for (const { id, home, away, lines } of events) {
      const exists = (await marketFactory.getSportsEvent(id)).status !== 0;
      if (exists) {
        console.log(`Skipping event "${id}" for ${marketType} because it already exists`);
        continue;
      }

      console.log(`Creating event for ${marketType}:`);
      console.log(`    Event ID: ${id}`);
      console.log(`    Home: ${home.name} (${home.id})`);
      console.log(`    Away: ${away.name} (${away.id})`);
      console.log(`    Lines h2h/sp/ou: ${lines.h2h[0]}:${lines.h2h[1]} / ${lines.spread} / ${lines.ou}`);

      const startTime = makeTime(60 * 5); // 5 minutes from now
      await marketFactory
        .createEvent(id, home.name, home.id, away.name, away.id, startTime, lines.spread, lines.ou, lines.h2h)
        .then((tx: ContractTransaction) => tx.wait(confirmations));

      const marketCount = await marketFactory.marketCount().then((bn: BigNumber) => bn.toNumber());
      const [m1, m2, m3] = [marketCount - 1, marketCount - 2, marketCount - 3];
      console.log(`Created markets ${m3}, ${m2}, ${m1} for ${marketType} ${marketFactory.address}`);
    }
  } finally {
    await resetLinkNode(marketFactory, originalLinkNode);
  }
}

// Handles any post-refactor sport with 1 market (h2h).
// Works with MMA and MLB.
async function sport1(
  signer: Signer,
  contracts: ContractInterfaces,
  confirmations: number,
  events: SportsSpecifierOneLine[],
  marketType: MarketFactoryType
) {
  const marketFactory = contracts.MarketFactories[marketFactoryIndex(contracts, marketType)]
    .marketFactory as MMAMarketFactory;

  const originalLinkNode = await handleLinkNode(marketFactory, signer);

  try {
    for (const { id, home, away, lines } of events) {
      console.log(`Creating event for ${marketType}:`);
      console.log(`    Event ID: ${id}`);
      console.log(`    Home: ${home.name} (${home.id})`);
      console.log(`    Away: ${away.name} (${away.id})`);
      console.log(`    Lines h2h: ${lines.h2h[0]}:${lines.h2h[1]}`);

      const startTime = makeTime(60 * 5); // 5 minutes from now
      await marketFactory
        .createEvent(id, home.name, home.id, away.name, away.id, startTime, lines.h2h)
        .then((tx: ContractTransaction) => tx.wait(confirmations));

      const marketCount = await marketFactory.marketCount().then((bn: BigNumber) => bn.toNumber());
      const m1 = marketCount - 1;
      console.log(`Created market ${m1} for ${marketType} ${marketFactory.address}`);
    }
  } finally {
    await resetLinkNode(marketFactory, originalLinkNode);
  }
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

function makeTime(futureSeconds: number): BigNumber {
  return BigNumber.from(Date.now()).div(1000).add(futureSeconds);
}
