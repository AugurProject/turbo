import { AMMFactory, CryptoCurrencyFetcher, CryptoCurrencyMarketFactoryV3, MasterChef } from "../../typechain";
import { BigNumber, BigNumberish } from "ethers";
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

export async function fetchInitialCryptoCurrency(
  fetcher: CryptoCurrencyFetcher,
  marketFactory: CryptoCurrencyMarketFactoryV3,
  ammFactory: AMMFactory,
  masterChef: MasterChef,
  initialOffset: BigNumberish = 0,
  bundleSize: BigNumberish = 50
): Promise<{
  factoryBundle: MarketFactoryBundle;
  markets: InitialCryptoCurrencyMarket[];
  timestamp: BigNumber | null;
}> {
  const marketCount = await marketFactory.marketCount();

  let factoryBundle: MarketFactoryBundle | undefined;
  let markets: StaticCryptoCurrencyMarketBundle[] = [];
  let timestamp: BigNumber | null = null;

  for (let offset = BigNumber.from(initialOffset); ; ) {
    const [rawFactoryBundle, rawMarketBundles, lowestMarketIndex, _timestamp] = await fetcher.fetchInitial(
      marketFactory.address,
      ammFactory.address,
      masterChef.address,
      offset,
      bundleSize
    );

    if (timestamp === null || _timestamp < timestamp) timestamp = _timestamp;

    if (!factoryBundle) factoryBundle = createMarketFactoryBundle(rawFactoryBundle.super);
    markets = markets.concat(rawMarketBundles.map(createStaticCryptoCurrencyMarketBundle));

    if (lowestMarketIndex.lte(1)) break; // don't grab the 0th market, which is fake
    offset = marketCount.sub(lowestMarketIndex);
  }

  return { factoryBundle, markets, timestamp };
}

export async function fetchDynamicCryptoCurrency(
  fetcher: CryptoCurrencyFetcher,
  marketFactory: CryptoCurrencyMarketFactoryV3,
  ammFactory: AMMFactory,
  // masterChef: MasterChef,
  initialOffset: BigNumberish = 0,
  bundleSize: BigNumberish = 50
): Promise<{ markets: DynamicCryptoCurrencyMarketBundle[]; timestamp: BigNumber | null }> {
  const marketCount = await marketFactory.marketCount();

  let markets: DynamicCryptoCurrencyMarketBundle[] = [];
  let timestamp: BigNumber | null = null;

  for (let offset = BigNumber.from(initialOffset); ; ) {
    const [rawMarketBundles, lowestMarketIndex, _timestamp] = await fetcher.fetchDynamic(
      marketFactory.address,
      ammFactory.address,
      // masterChef.address,
      offset,
      bundleSize
    );

    if (timestamp === null || _timestamp < timestamp) timestamp = _timestamp;

    markets = markets.concat(rawMarketBundles.map(createDynamicCryptoCurrencyMarketBundle));

    if (lowestMarketIndex.lte(1)) break;
    offset = marketCount.sub(lowestMarketIndex);
  }

  return { markets, timestamp };
}

export interface InitialCryptoCurrencyMarket extends StaticMarketBundle {
  coinIndex: BigNumberish;
  creationValue: BigNumberish;
  resolutionValue: BigNumberish;
  resolutionTime: BigNumberish;
}

function createStaticCryptoCurrencyMarketBundle(
  raw: RawStaticCryptoCurrencyMarketBundle
): StaticCryptoCurrencyMarketBundle {
  return {
    ...createStaticMarketBundle(raw.super),
    coinIndex: raw.coinIndex,
    creationValue: raw.creationValue,
    resolutionValue: raw.resolutionValue,
    resolutionTime: raw.resolutionTime,
  };
}

interface StaticCryptoCurrencyMarketBundle extends StaticMarketBundle {
  coinIndex: BigNumberish;
  creationValue: BigNumberish;
  resolutionValue: BigNumberish;
  resolutionTime: BigNumberish;
}

interface RawStaticCryptoCurrencyMarketBundle {
  super: RawStaticMarketBundle;
  coinIndex: BigNumberish;
  creationValue: BigNumberish;
  resolutionValue: BigNumberish;
  resolutionTime: BigNumberish;
}

export interface DynamicCryptoCurrencyMarketBundle extends DynamicMarketBundle {
  resolutionValue: BigNumberish;
}

interface RawDynamicCryptoCurrencyMarketBundle {
  super: RawDynamicMarketBundle;
  resolutionValue: BigNumberish;
}

function createDynamicCryptoCurrencyMarketBundle(
  raw: RawDynamicCryptoCurrencyMarketBundle
): DynamicCryptoCurrencyMarketBundle {
  return {
    ...createDynamicMarketBundle(raw.super),
    resolutionValue: raw.resolutionValue,
  };
}
