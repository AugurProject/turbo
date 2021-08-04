import * as SimpleSportsDailies from "./derived-simple-sport-dailies";
import * as MmaDailies from "./derived-mma-dailies";
import * as CryptoMarkets from "./derived-crypto-markets";
import * as NflMarkets from "./derived-nfl-dailies";

import { MARKET_FACTORY_TYPES, SPORTS_MARKET_TYPE } from "./constants";
import { MarketInfo } from "types";

export const getResolutionRules = (marketInfo: MarketInfo): string[] => {
  switch (marketInfo.marketFactoryType) {
    case MARKET_FACTORY_TYPES.SPORTSLINK: {
      return SimpleSportsDailies.getResolutionRules(marketInfo);
    }
    case MARKET_FACTORY_TYPES.CRYPTO: {
      return CryptoMarkets.getResolutionRules(marketInfo);
    }
    case MARKET_FACTORY_TYPES.MMALINK: {
      return MmaDailies.getResolutionRules(marketInfo);
    }
    case MARKET_FACTORY_TYPES.NFL: {
      return NflMarkets.getResolutionRules(marketInfo);
    }
    default:
      return [];
  }
};

const IgnoreMarkets = {
  "3": [SPORTS_MARKET_TYPE.SPREAD, SPORTS_MARKET_TYPE.OVER_UNDER],
};

export const isIgnoredMarket = (sportId: string, sportsMarketType: number): boolean => {
  // ignore MLB spread and over/under
  const sport = IgnoreMarkets[sportId];
  if (!sport) return false;
  return sport.includes(sportsMarketType);
};

export const deriveMarketInfo = (market: MarketInfo, marketData: any, marketFactoryType: string): MarketInfo => {
  switch (marketFactoryType) {
    case MARKET_FACTORY_TYPES.SPORTSLINK: {
      return SimpleSportsDailies.deriveMarketInfo(market, marketData);
    }
    case MARKET_FACTORY_TYPES.CRYPTO: {
      return CryptoMarkets.deriveMarketInfo(market, marketData);
    }
    case MARKET_FACTORY_TYPES.MMALINK: {
      return MmaDailies.deriveMarketInfo(market, marketData);
    }
    case MARKET_FACTORY_TYPES.NFL: {
      return NflMarkets.deriveMarketInfo(market, marketData);
    }
    default:
      return market;
  }
};
