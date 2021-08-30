import { BigNumber as BN } from "bignumber.js";
import { MarketInfo } from "types";
import { MMA_MARKET_TYPE, OUTCOME_YES_NAME, OUTCOME_NO_NAME, OUTCOME_NO_ID, OUTCOME_YES_ID } from "./constants";

const FUTURE_CATEGORIES = {
  NFL: ["Sports", "Football", "NFL"],
};

export const deriveMarketInfo = (market: MarketInfo, marketData: any) => {
  // build marketInfo outcomes
  // build ammOutcomes
  const outcomes = market?.subMarkets.map((s, i) => ({
    id: i,
    name: s.marketName,
    subOutcomes: [
      { id: OUTCOME_NO_ID, name: OUTCOME_NO_NAME, shareToken: s.shareTokens[OUTCOME_NO_ID] },
      { id: OUTCOME_YES_ID, name: OUTCOME_YES_NAME, shareToken: s.shareTokens[OUTCOME_YES_ID] },
    ],
  }));
  market.title = marketData.groupName;
  market.startTimestamp = new BN(String(marketData.endTime)).toNumber();
  return { ...market, outcomes, categories: FUTURE_CATEGORIES[market.category] };
};

export const getResolutionRules = (market: MarketInfo): string[] => {
  if (market.sportsMarketType === undefined) return [];
  const { sportsMarketType } = market;
  if (!sportsResolutionRules[sportsMarketType]) return [];
  return sportsResolutionRules[sportsMarketType];
};

// TODO: Rules might change depending on how contract resolves over/under MMA markets, need to verify after contract is written
const sportsResolutionRules = {
  [MMA_MARKET_TYPE.MONEY_LINE]: [
    `A fight is considered official once the first round begins, regardless of the scheduled or actual duration.`,
    `Market resolves based on the official result immediately following the fight. Later announcements, enquirers, or changes to the official result will not affect market settlement.`,
    `If a fighter is substituted before the fight begins the market should resolve as 'Draw/No Contest'.`,
    `If a fighter is disqualified during the fight, the opposing fighter should be declared the winner. If both fighters are disqualified the market should resolve as 'Draw/No Contest'.`,
    `If the fight is cancelled before it starts for any reason, the market should resolve as 'No Contest'.`,
    `A draw can occur when the fight is either stopped before completion or after all rounds are completed and goes to the judges' scorecards for decision.  If the match ends in a draw, only the 'Draw/No Contest' result should be the winning outcome.`,
  ],
};
