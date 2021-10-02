import { Web3Provider } from "@ethersproject/providers";
import {
  MarketFactory,
  fetchInitialSports,
  instantiateMarketFactory,
  AMMFactory__factory,
  MasterChef__factory,
  instantiateFetcher,
  SportsFetcher,
  Sport as SportMarketFactory,
} from "@augurproject/smart";

import { getProviderOrSigner } from "../components/ConnectAccount/utils";
import { decodeBaseMarketFetcher, decodeMarketDetailsFetcher } from "./derived-market-data";
import { isDataTooOld } from "./date-utils";

export const fetchContractData = async (config: MarketFactory, provider: Web3Provider, account: string) => {
  const offset = 0;
  const bundleSize = 1000;

  const fetcherContract = (instantiateFetcher(
    config.type,
    config.subtype,
    config.fetcher,
    getProviderOrSigner(provider, account)
  ) as unknown) as SportsFetcher;
  const marketFactoryContract = (instantiateMarketFactory(
    config.type,
    config.subtype,
    config.address,
    getProviderOrSigner(provider, account)
  ) as unknown) as SportMarketFactory;
  const masterChef = MasterChef__factory.connect(config.masterChef, getProviderOrSigner(provider, account));
  const ammFactoryContract = AMMFactory__factory.connect(config.ammFactory, getProviderOrSigner(provider, account));

  const { factoryBundle, markets, timestamp } = await fetchInitialSports(
    fetcherContract,
    marketFactoryContract,
    ammFactoryContract,
    masterChef,
    offset,
    bundleSize
  );

  if (isDataTooOld(timestamp.toNumber())) {
    console.error("node returnded data too old");
    throw new Error("contract data too old");
  }

  const factoryDetails = decodeBaseMarketFetcher(factoryBundle);

  const popMarkets = markets
    .map((m) => ({
      ...m,
      ...factoryDetails,
      homeTeamName: m.home.name,
      awayTeamName: m.away.name,
    }))
    .map((m) => decodeMarketDetailsFetcher(m, factoryDetails, config));

  return popMarkets.reduce((p, m) => ({ ...p, [m.marketId]: m }), {});
};
