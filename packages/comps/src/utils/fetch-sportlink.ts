
import { Web3Provider } from "@ethersproject/providers";
import {
    MarketFactory,
    createMMAMarketFactoryBundle,
    createNBAStaticMarketBundle,
    NFLFetcher__factory,
    MMAFetcher__factory,
    MLBFetcher__factory,
    fetchInitialEvents,
    instantiateMarketFactory,
} from "@augurproject/smart";

import { getProviderOrSigner } from "../components/ConnectAccount/utils";
import { decodeBaseMarketFetcher, decodeMarketDetailsFetcher } from "./derived-market-data";
import { MARKET_FACTORY_TYPES } from "./constants";

const getFetcherContract = (config: MarketFactory, provider: Web3Provider, account: string) => {
    switch (config?.type) {
        case MARKET_FACTORY_TYPES.NFL:
            return NFLFetcher__factory.connect(config.address, getProviderOrSigner(provider, account));
        case MARKET_FACTORY_TYPES.MMALINK:
            return MMAFetcher__factory.connect(config.address, getProviderOrSigner(provider, account));
        case MARKET_FACTORY_TYPES.SPORTSLINK:
            // MLB and NBA
            return MLBFetcher__factory.connect(config.address, getProviderOrSigner(provider, account));
        case MARKET_FACTORY_TYPES.CRYPTO: {
            // TODO: need to support
            console.error('crypto fetcher not supported at this time');
            return null;
        }
        default: {
            console.error('Config type not found', config.type)
            return null;
        }
    }
};

export const fetchContractData = async (config: MarketFactory, provider: Web3Provider, account: string) => {
    const offset = 0;
    const total = 1000;
    const contract = getFetcherContract(config, provider, account);
    const marketFactoryContract = instantiateMarketFactory(
        config.type,
        config.subtype,
        config.address,
        getProviderOrSigner(provider, account)
      );
    const [rawFactoryBundle, rawMarketBundles] = await fetchInitialEvents(
        contract,
        marketFactoryContract,
        config.address,
        config.ammFactory,
        offset,
        total
    );
    const factoryDetails = decodeBaseMarketFetcher(createMMAMarketFactoryBundle(rawFactoryBundle));
    return rawMarketBundles
        .map(createNBAStaticMarketBundle)
        .map((m) => ({ ...m, ...factoryDetails, marketFactoryType: config.type }))
        .map((m) => decodeMarketDetailsFetcher(m, factoryDetails, config));
};
