import { AMMFactory, CryptoFetcher, CryptoMarketFactory } from "../../typechain";
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
  marketFactory: CryptoMarketFactory,
  ammFactory: AMMFactory,
  initialOffset: BigNumberish = 0,
  bundleSize: BigNumberish = 50
): Promise<{ factoryBundle: MarketFactoryBundle; markets: InitialCryptoMarket[] }> {
  const marketCount = await marketFactory.marketCount();

  let factoryBundle: MarketFactoryBundle | undefined;
  let markets: StaticCryptoMarketBundle[] = [];

  for (let offset = BigNumber.from(initialOffset); ; ) {
    const [rawFactoryBundle, rawMarketBundles, lowestMarketIndex] = await fetcher.fetchInitial(
      marketFactory.address,
      ammFactory.address,
      offset,
      bundleSize
    );

    if (!factoryBundle) factoryBundle = createMarketFactoryBundle(rawFactoryBundle.super);
    markets = markets.concat(rawMarketBundles.map(createStaticCryptoMarketBundle));

    if (lowestMarketIndex.lte(1)) break; // don't grab the 0th market, which is fake
    offset = marketCount.sub(lowestMarketIndex);
  }

  return { factoryBundle, markets };
}

export async function fetchDynamicCrypto(
  fetcher: CryptoFetcher,
  marketFactory: CryptoMarketFactory,
  ammFactory: AMMFactory,
  initialOffset: BigNumberish = 0,
  bundleSize: BigNumberish = 50
) {
  const marketCount = await marketFactory.marketCount();

  let markets: DynamicCryptoMarketBundle[] = [];

  for (let offset = BigNumber.from(initialOffset); ; ) {
    const [rawMarketBundles, lowestMarketIndex] = await fetcher.fetchDynamic(
      marketFactory.address,
      ammFactory.address,
      offset,
      bundleSize
    );

    markets = markets.concat(rawMarketBundles.map(createDynamicCryptoMarketBundle));

    if (lowestMarketIndex.lte(1)) break;
    offset = marketCount.sub(lowestMarketIndex);
  }

  return { markets };
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
