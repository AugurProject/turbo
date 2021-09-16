import { Web3Provider } from "@ethersproject/providers";
import {
  MarketFactory,
  fetchInitialGroup,
  instantiateMarketFactory,
  AMMFactory__factory,
  MasterChef__factory,
  instantiateFetcher,
  GroupFetcher,
  Grouped as GroupMarketFactory,
} from "@augurproject/smart";

import { getProviderOrSigner } from "../components/ConnectAccount/utils";
import { decodeBaseMarketFetcher, decodeFutureMarketDetailsFetcher } from "./derived-market-data";
import { GROUP_INVALID_MARKET } from "./constants";

export const fetchContractData = async (config: MarketFactory, provider: Web3Provider, account: string) => {
  const offset = 0;
  const bundleSize = 100;

  const fetcherContract = (instantiateFetcher(
    config.type,
    config.subtype,
    config.fetcher,
    getProviderOrSigner(provider, account)
  ) as unknown) as GroupFetcher;

  const marketFactoryContract = (instantiateMarketFactory(
    config.type,
    config.subtype,
    config.address,
    getProviderOrSigner(provider, account)
  ) as unknown) as GroupMarketFactory;
  const masterChef = MasterChef__factory.connect(config.masterChef, getProviderOrSigner(provider, account));
  const ammFactoryContract = AMMFactory__factory.connect(config.ammFactory, getProviderOrSigner(provider, account));

  const { factoryBundle, markets } = await fetchInitialGroup(
    fetcherContract,
    marketFactoryContract,
    ammFactoryContract,
    masterChef,
    offset,
    bundleSize
  );

  const factoryDetails = decodeBaseMarketFetcher(factoryBundle);

  let groups = markets.reduce((p, m) => ({ ...p, [String(m.groupId)]: [...(p[String(m.groupId)] || []), m] }), {});
  try {
    groups = Object.keys(groups).map((key) => {
      const arr = groups[key];
      const isInvalid = arr.find((g) => g.marketType === GROUP_INVALID_MARKET);
      if (!isInvalid) return arr;
      const notInvalid = arr.filter((g) => g.marketType !== GROUP_INVALID_MARKET);
      return [isInvalid, ...notInvalid];
    });
  } catch (e) {
    console.error(e);
  }

  const groupedMarkets = Object.keys(groups).map((key) => ({
    ...factoryDetails,
    ...groups[key][0], // grab first market in the group for market descriptors
    marketId: `${config.address}-${key}`,
    subMarkets: groups[key],
    eventId: key,
    eventStatus: groups[key][0].groupStatus,
    marketIndex: key,
    title: groups[key][0]?.groupName,
  }));

  const popMarkets = groupedMarkets.map((m) => decodeFutureMarketDetailsFetcher(m, factoryDetails, config));

  return popMarkets.reduce((p, m) => ({ ...p, [m.marketId]: m }), {});
};
