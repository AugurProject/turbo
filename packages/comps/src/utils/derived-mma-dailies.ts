import { BigNumber as BN } from "bignumber.js";
import { MarketInfo } from "types";
import { NO_CONTEST_OUTCOME_ID, MMA_MARKET_TYPE } from "./constants";

const NAMING_TEAM = {
  HOME_TEAM: "HOME_TEAM",
  AWAY_TEAM: "AWAY_TEAM",
  FAV_TEAM: "FAV_TEAM",
  UNDERDOG_TEAM: "UNDERDOG_TEAM",
};
const NAMING_LINE = {
  SPREAD_LINE: "SPREAD_LINE",
  OVER_UNDER_LINE: "OVER_UNDER_LINE",
};
const NO_CONTEST = "No Contest";
const NO_CONTEST_TIE = "Draw/No Contest";

export const deriveMarketInfo = (market: MarketInfo, marketData: any) => {
  const {
    awayFighterId: coAwayTeamId,
    eventId: coEventId,
    homeFighterId: coHomeTeamId,
    estimatedStartTime,
    marketType = "0",
    homeFighterName,
    awayFighterName,
  } = marketData;
  // translate market data
  const eventId = String(coEventId?._hex || coEventId);
  const homeTeamId = String(coHomeTeamId); // home team identifier
  const awayTeamId = String(coAwayTeamId); // visiting team identifier
  const startTimestamp = new BN(String(estimatedStartTime)).toNumber(); // estiamted event start time
  const categories = ["Sports", "MMA", "UFC"];
  const line = null;
  const sportsMarketType = new BN(String(marketType)).toNumber(); // spread, todo: use constant when new sports market factory is ready.
  // will need get get team names
  const sportId = "7";

  const { shareTokens } = market;
  const outcomes = decodeOutcomes(market, shareTokens, homeFighterName, awayFighterName, sportsMarketType);
  const { title, description } = getMarketTitle(sportId, homeFighterName, awayFighterName, sportsMarketType);

  return {
    ...market,
    title,
    description,
    categories,
    outcomes,
    eventId,
    homeTeamId,
    awayTeamId,
    startTimestamp,
    sportId,
    sportsMarketType,
    spreadLine: line,
  };
};

const getOutcomeName = (outcomeId: number, homeTeam: string, awayTeam: string, sportsMarketType: number) => {
  const marketOutcome = getMarketOutcome(sportsMarketType, outcomeId);
  // create outcome name using market type and line
  if (outcomeId === NO_CONTEST_OUTCOME_ID) return marketOutcome;

  if (sportsMarketType === MMA_MARKET_TYPE.MONEY_LINE) {
    return populateHomeAway(marketOutcome, homeTeam, awayTeam);
  }

  return `Outcome ${outcomeId}`;
};

// todo: move this to own file when new market factory is available
export const getMarketTitle = (
  sportId: string,
  homeTeam: string,
  awayTeam: string,
  sportsMarketType: number
): { title: string; description: string } => {
  const marketTitles = getSportsTitles(sportsMarketType);
  if (!marketTitles) {
    console.error(`Could not find ${sportId} sport and/or ${sportsMarketType} market type`);
  }
  let title = "";
  let description = "";
  if (sportsMarketType === 0) {
    // head to head (money line)
    title = marketTitles.title;
    description = populateHomeAway(marketTitles.description, homeTeam, awayTeam);
  }

  return { title, description };
};

const populateHomeAway = (marketTitle: string, homeTeam: string, awayTeam: string): string => {
  return marketTitle.replace(NAMING_TEAM.AWAY_TEAM, awayTeam).replace(NAMING_TEAM.HOME_TEAM, homeTeam);
};

const getSportsTitles = (sportsMarketType: number): { title: string; description: string } => {
  if (!sportsData[sportsMarketType]) return null;
  return sportsData[sportsMarketType];
};

export const getResolutionRules = (market: MarketInfo): string[] => {
  if (market.sportsMarketType === undefined) return [];
  const { sportsMarketType } = market;
  if (!sportsResolutionRules[sportsMarketType]) return [];
  return sportsResolutionRules[sportsMarketType];
};

const getMarketOutcome = (sportsMarketType: number, outcomeId: number): string => {
  if (!sportsData[sportsMarketType]) {
    console.error(`MMA ${sportsMarketType} not found in collection`);
    return "";
  }
  const data = sportsData[sportsMarketType];
  if (!data?.outcomes) {
    console.error(`${sportsMarketType} not found in MMA outcomes data`);
    return "";
  }
  return data.outcomes[outcomeId];
};

const decodeOutcomes = (
  market: MarketInfo,
  shareTokens: string[] = [],
  homeTeam: string,
  awayTeam: string,
  sportsMarketType: number
) => {
  return shareTokens.map((shareToken, i) => {
    return {
      id: i,
      name: getOutcomeName(i, homeTeam, awayTeam, sportsMarketType), // todo: derive outcome name using market data
      symbol: shareToken,
      isInvalid: i === NO_CONTEST_OUTCOME_ID,
      isWinner: market.hasWinner && i === market.winner ? true : false,
      isFinalNumerator: false, // need to translate final numerator payout hash to outcome
      shareToken,
    };
  });
};

const sportsData = {
  [MMA_MARKET_TYPE.MONEY_LINE]: {
    title: `Which fighter will win?`,
    description: `${NAMING_TEAM.AWAY_TEAM} vs ${NAMING_TEAM.HOME_TEAM}`,
    outcomes: [NO_CONTEST_TIE, `${NAMING_TEAM.AWAY_TEAM}`, `${NAMING_TEAM.HOME_TEAM}`],
  },
  [MMA_MARKET_TYPE.OVER_UNDER]: {
    title: `Will there be over ${NAMING_LINE.OVER_UNDER_LINE}.5 total rounds scored?`,
    description: `${NAMING_TEAM.AWAY_TEAM} vs ${NAMING_TEAM.HOME_TEAM}`,
    outcomes: [NO_CONTEST, `Over ${NAMING_LINE.OVER_UNDER_LINE}.5`, `Under ${NAMING_LINE.OVER_UNDER_LINE}.5`],
  },
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
  [MMA_MARKET_TYPE.OVER_UNDER]: [
    `A fight is considered official once the first round begins, regardless of the scheduled or actual duration.`,
    `Market resolves based on the official result immediately following the fight. Later announcements, enquirers, or changes to the official result will not affect market settlement.`,
    `If a fighter is substituted before the fight begins the market should resolve as 'Draw/No Contest'.`,
    `If the fight is cancelled before it starts for any reason, the market should resolve as 'No Contest'.`,
    `If the official time is exactly on (equal to) the over/under number the market should resolve as 'Over'.`,
    `Markets referring to round/fight duration represents the actual time passed in the round/fight, as applicable, depending on the scheduled round/fight duration. For example, Over 2.5 Total Rounds will be settled as 'Over' once two and a half minutes or more in the 3rd Round has passed.`,
  ],
};
