import { Web3Provider } from "@ethersproject/providers";
import {
  MarketFactory,
  fetchInitialCrypto,
  instantiateMarketFactory,
  AMMFactory__factory,
  instantiateFetcher,
  CryptoFetcher,
  CryptoMarketFactory,
} from "@augurproject/smart";

import { getProviderOrSigner } from "../components/ConnectAccount/utils";
import { decodeBaseMarketFetcher, decodeMarketDetailsFetcher } from "./derived-market-data";

export const fetchContractData = async (config: MarketFactory, provider: Web3Provider, account: string) => {
  const offset = 0;
  const bundleSize = 100;

  const fetcherContract = (instantiateFetcher(
    config.type,
    config.subtype,
    config.fetcher,
    getProviderOrSigner(provider, account)
  ) as unknown) as CryptoFetcher;
  const marketFactoryContract = (instantiateMarketFactory(
    config.type,
    config.subtype,
    config.address,
    getProviderOrSigner(provider, account)
  ) as unknown) as CryptoMarketFactory;
  const ammFactoryContract = AMMFactory__factory.connect(config.ammFactory, getProviderOrSigner(provider, account));

  const { factoryBundle, markets } = await fetchInitialCrypto(
    fetcherContract,
    marketFactoryContract,
    ammFactoryContract,
    offset,
    bundleSize
  );

  const factoryDetails = decodeBaseMarketFetcher(factoryBundle);

  const popMarkets = markets
    .map((m) => ({ ...m, ...factoryDetails, marketFactoryType: config.type, sportId: null }))
    .map((m) => decodeMarketDetailsFetcher(m, factoryDetails, config));

  return popMarkets.reduce((p, m) => ({ ...p, [m.marketId]: m }), {});
};
