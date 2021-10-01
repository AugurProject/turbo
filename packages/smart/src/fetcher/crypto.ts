import { AMMFactory, CryptoFetcher, CryptoMarketFactoryV3, MasterChef } from "../../typechain";
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

export async function fetchInitialCrypto(
  fetcher: CryptoFetcher,
  marketFactory: CryptoMarketFactoryV3,
  ammFactory: AMMFactory,
  masterChef: MasterChef,
  initialOffset: BigNumberish = 0,
  bundleSize: BigNumberish = 50
): Promise<{ factoryBundle: MarketFactoryBundle; markets: InitialCryptoMarket[]; timestamp: BigNumber | null }> {
  const marketCount = await marketFactory.marketCount();

  let factoryBundle: MarketFactoryBundle | undefined;
  let markets: StaticCryptoMarketBundle[] = [];
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
    markets = markets.concat(rawMarketBundles.map(createStaticCryptoMarketBundle));

    if (lowestMarketIndex.lte(1)) break; // don't grab the 0th market, which is fake
    offset = marketCount.sub(lowestMarketIndex);
  }

  return { factoryBundle, markets, timestamp };
}

export async function fetchDynamicCrypto(
  fetcher: CryptoFetcher,
  marketFactory: CryptoMarketFactoryV3,
  ammFactory: AMMFactory,
  initialOffset: BigNumberish = 0,
  bundleSize: BigNumberish = 50
): Promise<{ markets: DynamicCryptoMarketBundle[]; timestamp: BigNumber | null }> {
  const marketCount = await marketFactory.marketCount();

  let markets: DynamicCryptoMarketBundle[] = [];
  let timestamp: BigNumber | null = null;

  for (let offset = BigNumber.from(initialOffset); ; ) {
    const [rawMarketBundles, lowestMarketIndex, _timestamp] = await fetcher.fetchDynamic(
      marketFactory.address,
      ammFactory.address,
      offset,
      bundleSize
    );

    if (timestamp === null || _timestamp < timestamp) timestamp = _timestamp;

    markets = markets.concat(rawMarketBundles.map(createDynamicCryptoMarketBundle));

    if (lowestMarketIndex.lte(1)) break;
    offset = marketCount.sub(lowestMarketIndex);
  }

  return { markets, timestamp };
}

export interface InitialCryptoMarket extends StaticMarketBundle {
  marketType: BigNumberish;
  coinIndex: BigNumberish;
  creationPrice: BigNumberish;
  resolutionPrice: BigNumberish;
  resolutionTime: BigNumberish;
}

function createStaticCryptoMarketBundle(raw: RawStaticCryptoMarketBundle): StaticCryptoMarketBundle {
  return {
    ...createStaticMarketBundle(raw.super),
    marketType: raw.marketType,
    coinIndex: raw.coinIndex,
    creationPrice: raw.creationPrice,
    resolutionPrice: raw.resolutionPrice,
    resolutionTime: raw.resolutionTime,
  };
}

interface StaticCryptoMarketBundle extends StaticMarketBundle {
  marketType: BigNumberish;
  coinIndex: BigNumberish;
  creationPrice: BigNumberish;
  resolutionPrice: BigNumberish;
  resolutionTime: BigNumberish;
}

interface RawStaticCryptoMarketBundle {
  super: RawStaticMarketBundle;
  marketType: BigNumberish;
  coinIndex: BigNumberish;
  creationPrice: BigNumberish;
  resolutionPrice: BigNumberish;
  resolutionTime: BigNumberish;
}

export interface DynamicCryptoMarketBundle extends DynamicMarketBundle {
  resolutionPrice: BigNumberish;
}

interface RawDynamicCryptoMarketBundle {
  super: RawDynamicMarketBundle;
  resolutionPrice: BigNumberish;
}

function createDynamicCryptoMarketBundle(raw: RawDynamicCryptoMarketBundle): DynamicCryptoMarketBundle {
  return {
    ...createDynamicMarketBundle(raw.super),
    resolutionPrice: raw.resolutionPrice,
  };
}
