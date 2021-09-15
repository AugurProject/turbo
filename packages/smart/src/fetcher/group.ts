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
import { AMMFactory, Grouped as GroupMarketFactory, GroupFetcher, MasterChef } from "../../typechain";
import { BigNumber, BigNumberish } from "ethers";

export async function fetchInitialGroup(
  fetcher: GroupFetcher,
  marketFactory: GroupMarketFactory,
  ammFactory: AMMFactory,
  masterChef: MasterChef,
  initialOffset: BigNumberish = 0,
  bundleSize: BigNumberish = 50
): Promise<{ factoryBundle: MarketFactoryBundle; markets: InitialGroupsMarket[] }> {
  const groupCount = await marketFactory.groupCount();

  let factoryBundle: MarketFactoryBundle | undefined;
  let groupBundles: StaticGroupBundle[] = [];

  for (let offset = BigNumber.from(initialOffset); ; ) {
    const [rawFactoryBundle, rawGroupBundles, lowestGroupIndex] = await fetcher.fetchInitial(
      marketFactory.address,
      ammFactory.address,
      masterChef.address,
      offset,
      bundleSize
    );

    if (!factoryBundle) factoryBundle = createMarketFactoryBundle(rawFactoryBundle.super);
    groupBundles = groupBundles.concat(rawGroupBundles.map(createStaticGroupBundle));

    if (lowestGroupIndex.eq(0)) break;
    offset = groupCount.sub(lowestGroupIndex);
  }

  const markets: InitialGroupsMarket[] = [];
  for (const group of groupBundles) {
    for (const index in group.markets) {
      const market = group.markets[index];
      markets.push({
        ...market,
        groupId: group.id,
        groupName: group.name,
        groupStatus: group.status,
        endTime: group.endTime,
        marketName: group.marketNames[index],
        marketType: GroupMarketType.Regular,
        category: group.category,
      });
    }
    const invalidMarket = group.invalidMarket;
    markets.push({
      ...invalidMarket,
      groupId: group.id,
      groupName: group.name,
      groupStatus: group.status,
      endTime: group.endTime,
      marketName: group.invalidMarketName,
      marketType: GroupMarketType.Invalid,
      category: group.category,
    });
  }

  return { factoryBundle, markets };
}

export async function fetchDynamicGroup(
  fetcher: GroupFetcher,
  marketFactory: GroupMarketFactory,
  ammFactory: AMMFactory,
  initialOffset: BigNumberish = 0,
  bundleSize: BigNumberish = 50
): Promise<{ markets: DynamicGroupsMarket[] }> {
  const groupCount = await marketFactory.groupCount();

  let groupBundles: DynamicGroupBundle[] = [];

  for (let offset = BigNumber.from(initialOffset); ; ) {
    const [rawGroupBundles, lowestGroupIndex] = await fetcher.fetchDynamic(
      marketFactory.address,
      ammFactory.address,
      offset,
      bundleSize
    );

    groupBundles = groupBundles.concat(rawGroupBundles.map(createDynamicGroupBundle));

    if (lowestGroupIndex.eq(0)) break;
    offset = groupCount.sub(lowestGroupIndex);
  }

  const markets: DynamicGroupsMarket[] = [];
  for (const group of groupBundles) {
    for (const market of group.markets) {
      markets.push({
        ...market,
        groupId: group.id,
        groupStatus: group.status,
      });
    }
    const invalidMarket = group.invalidMarket;
    markets.push({
      ...invalidMarket,
      groupId: group.id,
      groupStatus: group.status,
    });
  }

  return { markets };
}

export interface InitialGroupsMarket extends StaticMarketBundle {
  groupId: BigNumberish;
  groupName: string;
  groupStatus: BigNumberish;
  endTime: BigNumberish;
  marketType: BigNumberish;
  marketName: string;
  category: string;
}

export interface DynamicGroupsMarket extends DynamicMarketBundle {
  groupId: BigNumberish;
  groupStatus: BigNumberish;
}

function createStaticGroupBundle(raw: RawStaticGroupBundle): StaticGroupBundle {
  return {
    id: raw.id,
    name: raw.name,
    markets: raw.markets.map((m) => createStaticMarketBundle(m)),
    marketNames: raw.marketNames,
    endTime: raw.endTime,
    status: raw.status,
    invalidMarket: createStaticMarketBundle(raw.invalidMarket),
    invalidMarketName: raw.invalidMarketName,
    category: raw.category,
  };
}

function createDynamicGroupBundle(raw: RawDynamicGroupsGroupBundle): DynamicGroupBundle {
  return {
    id: raw.id,
    markets: raw.markets.map((m) => createDynamicMarketBundle(m)),
    invalidMarket: createDynamicMarketBundle(raw.invalidMarket),
    status: raw.status,
  };
}

interface StaticGroupBundle {
  id: BigNumberish;
  name: string;
  markets: StaticMarketBundle[];
  marketNames: string[];
  endTime: BigNumberish;
  status: BigNumberish;
  invalidMarket: StaticMarketBundle;
  invalidMarketName: string;
  category: string;
}

interface RawStaticGroupBundle extends Omit<StaticGroupBundle, "markets" | "invalidMarket"> {
  markets: RawStaticMarketBundle[];
  invalidMarket: RawStaticMarketBundle;
}

interface DynamicGroupBundle {
  id: BigNumberish;
  markets: DynamicMarketBundle[];
  invalidMarket: DynamicMarketBundle;
  status: BigNumberish;
}

interface RawDynamicGroupsGroupBundle extends Omit<DynamicGroupBundle, "markets" | "invalidMarket"> {
  markets: RawDynamicMarketBundle[];
  invalidMarket: RawDynamicMarketBundle;
}

export enum GroupMarketType {
  Regular,
  Invalid,
}
