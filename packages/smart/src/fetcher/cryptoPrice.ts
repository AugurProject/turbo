import { AMMFactory, CryptoPriceFetcher, CryptoPriceMarketFactoryV3 } from "../../typechain";
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

export async function fetchInitialCryptoPrice(
  fetcher: CryptoPriceFetcher,
  marketFactory: CryptoPriceMarketFactoryV3,
  ammFactory: AMMFactory,
  initialOffset: BigNumberish = 0,
  bundleSize: BigNumberish = 50
): Promise<{ factoryBundle: MarketFactoryBundle; markets: InitialCryptoPriceMarket[] }> {
  const marketCount = await marketFactory.marketCount();

  let factoryBundle: MarketFactoryBundle | undefined;
  let markets: StaticCryptoPriceMarketBundle[] = [];

  for (let offset = BigNumber.from(initialOffset); ; ) {
    const [rawFactoryBundle, rawMarketBundles, lowestMarketIndex] = await fetcher.fetchInitial(
      marketFactory.address,
      ammFactory.address,
      offset,
      bundleSize
    );

    if (!factoryBundle) factoryBundle = createMarketFactoryBundle(rawFactoryBundle.super);
    markets = markets.concat(rawMarketBundles.map(createStaticCryptoPriceMarketBundle));

    if (lowestMarketIndex.lte(1)) break; // don't grab the 0th market, which is fake
    offset = marketCount.sub(lowestMarketIndex);
  }

  return { factoryBundle, markets };
}

export async function fetchDynamicCryptoPrice(
  fetcher: CryptoPriceFetcher,
  marketFactory: CryptoPriceMarketFactoryV3,
  ammFactory: AMMFactory,
  initialOffset: BigNumberish = 0,
  bundleSize: BigNumberish = 50
): Promise<{ markets: DynamicCryptoPriceMarketBundle[] }> {
  const marketCount = await marketFactory.marketCount();

  let markets: DynamicCryptoPriceMarketBundle[] = [];

  for (let offset = BigNumber.from(initialOffset); ; ) {
    const [rawMarketBundles, lowestMarketIndex] = await fetcher.fetchDynamic(
      marketFactory.address,
      ammFactory.address,
      offset,
      bundleSize
    );

    markets = markets.concat(rawMarketBundles.map(createDynamicCryptoPriceMarketBundle));

    if (lowestMarketIndex.lte(1)) break;
    offset = marketCount.sub(lowestMarketIndex);
  }

  return { markets };
}

export interface InitialCryptoPriceMarket extends StaticMarketBundle {
  coinIndex: BigNumberish;
  creationPrice: BigNumberish;
  resolutionPrice: BigNumberish;
  resolutionTime: BigNumberish;
}

function createStaticCryptoPriceMarketBundle(raw: RawStaticCryptoPriceMarketBundle): StaticCryptoPriceMarketBundle {
  return {
    ...createStaticMarketBundle(raw.super),
    coinIndex: raw.coinIndex,
    creationPrice: raw.creationPrice,
    resolutionPrice: raw.resolutionPrice,
    resolutionTime: raw.resolutionTime,
  };
}

interface StaticCryptoPriceMarketBundle extends StaticMarketBundle {
  coinIndex: BigNumberish;
  creationPrice: BigNumberish;
  resolutionPrice: BigNumberish;
  resolutionTime: BigNumberish;
}

interface RawStaticCryptoPriceMarketBundle {
  super: RawStaticMarketBundle;
  coinIndex: BigNumberish;
  creationPrice: BigNumberish;
  resolutionPrice: BigNumberish;
  resolutionTime: BigNumberish;
}

export interface DynamicCryptoPriceMarketBundle extends DynamicMarketBundle {
  resolutionPrice: BigNumberish;
}

interface RawDynamicCryptoPriceMarketBundle {
  super: RawDynamicMarketBundle;
  resolutionPrice: BigNumberish;
}

function createDynamicCryptoPriceMarketBundle(raw: RawDynamicCryptoPriceMarketBundle): DynamicCryptoPriceMarketBundle {
  return {
    ...createDynamicMarketBundle(raw.super),
    resolutionPrice: raw.resolutionPrice,
  };
}
