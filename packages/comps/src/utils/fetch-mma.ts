import { Web3Provider } from "@ethersproject/providers";
import {
  MarketFactory,
  MMAFetcher__factory,
  createMMAMarketFactoryBundle,
  createMMAStaticMarketBundle,
} from "@augurproject/smart";

import { getProviderOrSigner } from "../components/ConnectAccount/utils";
import { decodeBaseMarketFetcher, decodeMarketDetailsFetcher } from "./derived-market-data";

const getFetcherContract = (address: string, provider: Web3Provider, account: string) => {
  return MMAFetcher__factory.connect(address, getProviderOrSigner(provider, account));
};

export const fetchContractData = async (config: MarketFactory, provider: Web3Provider, account: string) => {
  const offset = 0;
  const total = 1000;
  const contract = getFetcherContract(config.fetcher, provider, account);
  const [rawFactoryBundle, rawMarketBundles] = await contract.fetchInitial(
    config.address,
    config.ammFactory,
    offset,
    total
  );
  const factoryDetails = decodeBaseMarketFetcher(createMMAMarketFactoryBundle(rawFactoryBundle));
  return rawMarketBundles
    .map(createMMAStaticMarketBundle)
    .map((m) => ({ ...m, ...factoryDetails, marketFactoryType: config.type }))
    .map((m) => decodeMarketDetailsFetcher(m, factoryDetails, config));
};
