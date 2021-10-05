import {
  AMMFactory,
  AMMFactory__factory,
  Cash,
  Cash__factory,
  SportsLinkMarketFactoryV2,
  SportsLinkMarketFactoryV2__factory,
  TrustedMarketFactoryV3,
  TrustedMarketFactoryV3__factory,
  CryptoMarketFactoryV3__factory,
  CryptoMarketFactoryV3,
  MMAMarketFactoryV3,
  MMAMarketFactoryV3__factory,
  SportsLinkMarketFactoryV1__factory,
  SportsLinkMarketFactoryV1,
  NFLMarketFactoryV3__factory,
  NFLMarketFactoryV3,
  NBAMarketFactoryV3__factory,
  NBAMarketFactoryV3,
  MLBMarketFactoryV3,
  MLBMarketFactoryV3__factory,
  GroupedMarketFactoryV3__factory,
  GroupedMarketFactoryV3,
  TrustedMarketFactoryV2__factory,
  CryptoMarketFactoryV2__factory,
  MMALinkMarketFactoryV2__factory,
  NFLMarketFactoryV2__factory,
  TrustedMarketFactoryV2,
  CryptoMarketFactoryV2,
  MMALinkMarketFactoryV2,
  NFLMarketFactoryV2,
  SportsFetcher,
  CryptoFetcher,
  CryptoFetcher__factory,
  SportsFetcher__factory,
  GroupFetcher,
  GroupFetcher__factory,
  CryptoCurrencyMarketFactoryV3,
  CryptoCurrencyMarketFactoryV3__factory,
  CryptoCurrencyFetcher,
} from "./typechain";
import { addresses } from "./addresses";
import { Signer } from "ethers";
import { Provider } from "@ethersproject/providers";
import { ChainId, MarketFactorySubType, MarketFactoryType } from "./constants";
import { CryptoCurrencyFetcher__factory } from "./typechain";

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

export function buildContractInterfaces(signerOrProvider: Signer | Provider, chainId: ChainId): ContractInterfaces {
  const contractAddresses = addresses[chainId];
  if (typeof contractAddresses === "undefined") throw new Error(`Addresses for chain ${chainId} not found.`);

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
