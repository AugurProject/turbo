import {
  createDynamicMarketBundle,
  createMarketFactoryBundle,
  createStaticMarketBundle,
  DynamicMarketBundle,
  MarketFactoryBundle,
  RawDynamicMarketBundle,
  RawStaticMarketBundle,
  StaticMarketBundle,
} from "./common";
import { AMMFactory, Sport as SportMarketFactory, SportsFetcher } from "../../typechain";
import { BigNumber, BigNumberish } from "ethers";

export async function fetchInitialSports(
  fetcher: SportsFetcher,
  marketFactory: SportMarketFactory,
  ammFactory: AMMFactory,
  initialOffset: BigNumberish = 0,
  bundleSize: BigNumberish = 50
): Promise<{ factoryBundle: MarketFactoryBundle; markets: InitialSportsMarket[] }> {
  const eventCount = await marketFactory.eventCount();

  let factoryBundle: MarketFactoryBundle | undefined;
  let eventBundles: StaticSportsEventBundle[] = [];

  for (let offset = BigNumber.from(initialOffset); ; ) {
    const [rawFactoryBundle, rawEventBundles, lowestEventIndex] = await fetcher.fetchInitial(
      marketFactory.address,
      ammFactory.address,
      offset,
      bundleSize
    );

    if (!factoryBundle) factoryBundle = createMarketFactoryBundle(rawFactoryBundle.super);
    eventBundles = eventBundles.concat(rawEventBundles.map(createStaticSportsEventBundle));

    if (lowestEventIndex.eq(0)) break;
    offset = eventCount.sub(lowestEventIndex);
  }

  const markets: InitialSportsMarket[] = [];
  for (const event of eventBundles) {
    for (const index in event.markets) {
      const market = event.markets[index];
      markets.push({
        ...market,
        eventId: event.id,
        eventStatus: event.status,
        estimatedStartTime: event.estimatedStartTime,
        line: event.lines[index],
        marketType: Number(index), // market types are implied by the position in the SportsEvent.markets array
        home: {
          id: event.homeTeamId,
          name: event.homeTeamName,
          score: event.homeScore,
        },
        away: {
          id: event.awayTeamId,
          name: event.awayTeamName,
          score: event.awayScore,
        },
      });
    }
  }

  return { factoryBundle, markets };
}

export async function fetchDynamicSports(
  fetcher: SportsFetcher,
  marketFactory: SportMarketFactory,
  ammFactory: AMMFactory,
  initialOffset: BigNumberish = 0,
  bundleSize: BigNumberish = 50
): Promise<{markets: DynamicMarketBundle[]}> {
  const eventCount = await marketFactory.eventCount();

  let eventBundles: DynamicSportsEventBundle[] = [];

  for (let offset = BigNumber.from(initialOffset); ; ) {
    const [rawEventBundles, lowestEventIndex] = await fetcher.fetchDynamic(
      marketFactory.address,
      ammFactory.address,
      offset,
      bundleSize
    );

    eventBundles = eventBundles.concat(rawEventBundles.map(createDynamicSportsEventBundle));

    if (lowestEventIndex.eq(0)) break;
    offset = eventCount.sub(lowestEventIndex);
  }

  const markets: DynamicSportsMarket[] = [];
  for (const event of eventBundles) {
    for (const market of event.markets) {
      markets.push({
        ...market,
        eventId: event.id,
        eventStatus: event.status,
        home: {
          score: event.homeScore,
        },
        away: {
          score: event.awayScore,
        },
      });
    }
  }

  return { markets };
}

export interface InitialSportsMarket extends StaticMarketBundle {
  eventId: BigNumberish;
  eventStatus: BigNumberish;
  estimatedStartTime: BigNumberish;
  marketType: BigNumberish;
  line: BigNumberish;
  home: SportsTeam;
  away: SportsTeam;
}

export interface DynamicSportsMarket extends DynamicMarketBundle {
  eventId: BigNumberish;
  eventStatus: BigNumberish;
  home: { score: BigNumberish };
  away: { score: BigNumberish };
}

interface SportsTeam {
  id: BigNumberish;
  name: string;
  score: BigNumberish;
}

function createStaticSportsEventBundle(raw: RawStaticSportsEventBundle): StaticSportsEventBundle {
  return {
    id: raw.id,
    markets: raw.markets.map((m) => createStaticMarketBundle(m)),
    lines: raw.lines,
    estimatedStartTime: raw.estimatedStartTime,
    homeTeamId: raw.homeTeamId,
    awayTeamId: raw.awayTeamId,
    homeTeamName: raw.homeTeamName,
    awayTeamName: raw.awayTeamName,
    status: raw.status,
    homeScore: raw.homeScore,
    awayScore: raw.awayScore,
  };
}

function createDynamicSportsEventBundle(raw: RawDynamicSportsEventBundle): DynamicSportsEventBundle {
  return {
    id: raw.id,
    markets: raw.markets.map((m) => createDynamicMarketBundle(m)),
    status: raw.status,
    homeScore: raw.homeScore,
    awayScore: raw.awayScore,
  };
}

interface StaticSportsEventBundle {
  id: BigNumberish;
  markets: StaticMarketBundle[];
  lines: BigNumberish[];
  estimatedStartTime: BigNumberish;
  homeTeamId: BigNumberish;
  awayTeamId: BigNumberish;
  homeTeamName: string;
  awayTeamName: string;
  status: BigNumberish;
  homeScore: BigNumberish;
  awayScore: BigNumberish;
}

interface RawStaticSportsEventBundle extends Omit<StaticSportsEventBundle, "markets"> {
  markets: RawStaticMarketBundle[];
}

interface DynamicSportsEventBundle {
  id: BigNumberish;
  markets: DynamicMarketBundle[];
  status: BigNumberish;
  homeScore: BigNumberish;
  awayScore: BigNumberish;
}

interface RawDynamicSportsEventBundle extends Omit<DynamicSportsEventBundle, "markets"> {
  markets: RawDynamicMarketBundle[];
}
