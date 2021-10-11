import {
  AMMFactory,
  AMMFactory__factory,
  Cash,
  Cash__factory,
  CryptoCurrencyFetcher,
  CryptoCurrencyFetcher__factory,
  CryptoCurrencyMarketFactoryV3,
  CryptoCurrencyMarketFactoryV3__factory,
  CryptoFetcher,
  CryptoFetcher__factory,
  CryptoMarketFactoryV2,
  CryptoMarketFactoryV2__factory,
  CryptoMarketFactoryV3,
  CryptoMarketFactoryV3__factory,
  GroupedMarketFactoryV3,
  GroupedMarketFactoryV3__factory,
  GroupFetcher,
  GroupFetcher__factory,
  MLBMarketFactoryV3,
  MLBMarketFactoryV3__factory,
  MMALinkMarketFactoryV2,
  MMALinkMarketFactoryV2__factory,
  MMAMarketFactoryV3,
  MMAMarketFactoryV3__factory,
  NBAMarketFactoryV3,
  NBAMarketFactoryV3__factory,
  NFLMarketFactoryV2,
  NFLMarketFactoryV2__factory,
  NFLMarketFactoryV3,
  NFLMarketFactoryV3__factory,
  SportsFetcher,
  SportsFetcher__factory,
  SportsLinkMarketFactoryV1,
  SportsLinkMarketFactoryV1__factory,
  SportsLinkMarketFactoryV2,
  SportsLinkMarketFactoryV2__factory,
  TrustedMarketFactoryV2,
  TrustedMarketFactoryV2__factory,
  TrustedMarketFactoryV3,
  TrustedMarketFactoryV3__factory,
} from "./typechain";
import { addresses } from "./addresses";
import { Signer } from "ethers";
import { Provider } from "@ethersproject/providers";
import { MarketFactorySubType, MarketFactoryType } from "./constants";
import { isNetworkName } from "./tasks/common";

export * from "./typechain";
export * from "./addresses";
export * from "./constants";
export * from "./src";
export { calcSellCompleteSets, estimateBuy } from "./src/bmath";
export { mapOverObject } from "./src/utils/common-functions";
export * from "./src/utils/round-management";

export interface ContractInterfaces {
  ReputationToken: Cash;
  MarketFactories: {
    marketFactory: MarketFactoryContract;
    ammFactory: AMMFactory;
    marketFactoryType: MarketFactoryType;
    marketFactorySubType: MarketFactorySubType;
  }[];
}
export type MarketFactoryContract =
  | SportsLinkMarketFactoryV1
  | SportsLinkMarketFactoryV2
  | TrustedMarketFactoryV2
  | TrustedMarketFactoryV3
  | CryptoMarketFactoryV2
  | CryptoMarketFactoryV3
  | GroupedMarketFactoryV3
  | CryptoCurrencyMarketFactoryV3
  | MMALinkMarketFactoryV2
  | MMAMarketFactoryV3
  | NBAMarketFactoryV3
  | MLBMarketFactoryV3
  | NFLMarketFactoryV2
  | NFLMarketFactoryV3;

export type FetcherContract = CryptoFetcher | SportsFetcher | GroupFetcher | CryptoCurrencyFetcher;

export function buildContractInterfaces(signerOrProvider: Signer | Provider, networkName: string): ContractInterfaces {
  if (isNetworkName(networkName)) {
    const contractAddresses = addresses[networkName];
    if (typeof contractAddresses === "undefined") throw new Error(`Addresses for chain ${networkName} not found.`);

    const MarketFactories = contractAddresses.marketFactories.map(
      ({ type, subtype, address, ammFactory: ammFactoryAddress }) => {
        const marketFactory: MarketFactoryContract = instantiateMarketFactory(type, subtype, address, signerOrProvider);
        const ammFactory = AMMFactory__factory.connect(ammFactoryAddress, signerOrProvider);
        return { marketFactory, ammFactory, marketFactoryType: type, marketFactorySubType: subtype };
      }
    );

    return {
      ReputationToken: Cash__factory.connect(contractAddresses.reputationToken, signerOrProvider),
      MarketFactories,
    };
  } else {
    throw new Error(`Invalid network name ${networkName}.`);
  }
}

type InstantiationByType<T> = {
  [Property in MarketFactorySubType]?: {
    [Property in MarketFactoryType]?: {
      connect(address: string, signerOrProvider: Signer | Provider): T;
    };
  };
};

export function instantiateMarketFactory(
  type: MarketFactoryType,
  subtype: MarketFactorySubType,
  address: string,
  signerOrProvider: Signer | Provider
): MarketFactoryContract {
  const mapping: InstantiationByType<MarketFactoryContract> = {
    V1: {
      SportsLink: SportsLinkMarketFactoryV1__factory,
    },
    V2: {
      SportsLink: SportsLinkMarketFactoryV2__factory,
      Trusted: TrustedMarketFactoryV2__factory,
      Crypto: CryptoMarketFactoryV2__factory,
      MMALink: MMALinkMarketFactoryV2__factory,
      NFL: NFLMarketFactoryV2__factory,
      MLB: SportsLinkMarketFactoryV2__factory,
      NBA: SportsLinkMarketFactoryV2__factory,
    },
    V3: {
      Crypto: CryptoMarketFactoryV3__factory,
      CryptoCurrency: CryptoCurrencyMarketFactoryV3__factory,
      Trusted: TrustedMarketFactoryV3__factory,
      Grouped: GroupedMarketFactoryV3__factory,
      MMA: MMAMarketFactoryV3__factory,
      NFL: NFLMarketFactoryV3__factory,
      NBA: NBAMarketFactoryV3__factory,
      MLB: MLBMarketFactoryV3__factory,
    },
  };

  const factory = (mapping[subtype] || {})[type];
  if (factory) {
    return factory.connect(address, signerOrProvider);
  } else {
    throw Error(`No market factory matching type=${type} subtype=${subtype}`);
  }
}

export function instantiateFetcher(
  type: MarketFactoryType,
  subtype: MarketFactorySubType,
  address: string,
  signerOrProvider: Signer | Provider
): FetcherContract {
  const mapping: InstantiationByType<FetcherContract> = {
    V3: {
      Crypto: CryptoFetcher__factory,
      CryptoCurrency: CryptoCurrencyFetcher__factory,
      MMA: SportsFetcher__factory,
      NFL: SportsFetcher__factory,
      NBA: SportsFetcher__factory,
      MLB: SportsFetcher__factory,
      Grouped: GroupFetcher__factory,
    },
  };

  const factory = (mapping[subtype] || {})[type];
  if (factory) {
    return factory.connect(address, signerOrProvider);
  } else {
    throw Error(`No fetcher matching type=${type} subtype=${subtype}`);
  }
}
