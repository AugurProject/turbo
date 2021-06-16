import * as SimpleSportsDailies from "./derived-simple-sport-dailies";
import * as MmaDailies from "./derived-mma-dailies";
import * as CryptoMarkets from "./derived-crypto-markets";
import { MARKET_FACTORY_TYPES, SPORTS_MARKET_TYPE } from "./constants";
import { MarketInfo } from "types";

const simpleDailiesSportIds = ["3", "4"]; // needed for when other sports come in
const mmaDailiesSportIds = ["7"];

export const getSportsResolutionRules = (marketInfo: MarketInfo, sportId: string, sportsMarketType: number): string[] => {
  if (marketInfo.marketFactoryType === MARKET_FACTORY_TYPES.SPORTSLINK) {
    if (mmaDailiesSportIds.includes(sportId)) return MmaDailies.getSportsResolutionRules(sportId, sportsMarketType);
    return SimpleSportsDailies.getSportsResolutionRules(sportId, sportsMarketType);
  } else if (marketInfo.marketFactoryType === MARKET_FACTORY_TYPES.CRYPTO) {
    return CryptoMarkets.getResolutionRules())
  }


  return [];
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

  if (marketFactoryType === MARKET_FACTORY_TYPES.SPORTSLINK) {
    return SimpleSportsDailies.deriveMarketInfo(market, marketData);
  } else if (marketFactoryType === MARKET_FACTORY_TYPES.CRYPTO) {
    return CryptoMarkets.
  }

  return market;
}