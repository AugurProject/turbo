
import { Web3Provider } from "@ethersproject/providers";
import {
    MarketFactory,
    createMMAMarketFactoryBundle,
    createNBAStaticMarketBundle,
    fetchInitialEvents,
    instantiateMarketFactory,
    AMMFactory__factory,
    SportsFetcher__factory,
} from "@augurproject/smart";

import { getProviderOrSigner } from "../components/ConnectAccount/utils";
import { decodeBaseMarketFetcher, decodeMarketDetailsFetcher } from "./derived-market-data";

export const fetchContractData = async (config: MarketFactory, provider: Web3Provider, account: string) => {
    const offset = 0;
    const bundleSize = 1000;
    const fetcherContract = SportsFetcher__factory.connect(config.address, getProviderOrSigner(provider, account));
    const marketFactoryContract = instantiateMarketFactory(
        config.type,
        config.subtype,
        config.address,
        getProviderOrSigner(provider, account)
      );
    const ammFactoryContract = AMMFactory__factory.connect(config.ammFactory, getProviderOrSigner(provider, account));
    const { factoryBundle, eventBundles } = await fetchInitialEvents(
        fetcherContract,
        marketFactoryContract,
        ammFactoryContract,        
        bundleSize,
        offset
    );
    const factoryDetails = decodeBaseMarketFetcher(createMMAMarketFactoryBundle(factoryBundle));
    return eventBundles
        .map(createNBAStaticMarketBundle)
        .map((m) => ({ ...m, ...factoryDetails, marketFactoryType: config.type }))
        .map((m) => decodeMarketDetailsFetcher(m, factoryDetails, config));
};
