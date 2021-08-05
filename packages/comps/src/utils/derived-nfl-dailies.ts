import { BigNumber as BN } from "bignumber.js";
import { MarketInfo } from "types";
import { NO_CONTEST_OUTCOME_ID, SPORTS_MARKET_TYPE } from "./constants";

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
    awayTeamId: coAwayTeamId,
    eventId: coEventId,
    homeTeamId: coHomeTeamId,
    estimatedStartTime,
    marketType = 0,
  } = marketData;
  // translate market data
  const eventId = String(coEventId._hex || coEventId);
  const homeTeamId = String(coHomeTeamId); // home team identifier
  const awayTeamId = String(coAwayTeamId); // visiting team identifier
  const startTimestamp = new BN(String(estimatedStartTime)).toNumber(); // estiamted event start time
  const categories = ["Sports", "Football", "NFL"];
  const line = null;
  const sportsMarketType = new BN(String(marketType)).toNumber(); // spread, todo: use constant when new sports market factory is ready.
  // will need get get team names
  const homeTeam = String(marketData["homeTeamName"]);
  const awayTeam = String(marketData["awayTeamName"]);
  const sportId = "2";

  const { shareTokens } = market;
  const outcomes = decodeOutcomes(market, shareTokens, homeTeam, awayTeam, sportsMarketType);
  const { title, description } = getMarketTitle(sportId, homeTeam, awayTeam, sportsMarketType);

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

  if (sportsMarketType === SPORTS_MARKET_TYPE.MONEY_LINE) {
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
    console.error(`NFL ${sportsMarketType} not found in collection`);
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
  [SPORTS_MARKET_TYPE.MONEY_LINE]: {
    title: `Which team will win?`,
    description: `${NAMING_TEAM.AWAY_TEAM} vs ${NAMING_TEAM.HOME_TEAM}`,
    outcomes: [NO_CONTEST_TIE, `${NAMING_TEAM.AWAY_TEAM}`, `${NAMING_TEAM.HOME_TEAM}`],
  },
  [SPORTS_MARKET_TYPE.SPREAD]: {
    title: `Will the ${NAMING_TEAM.FAV_TEAM} defeat the ${NAMING_TEAM.UNDERDOG_TEAM} by more than ${NAMING_LINE.SPREAD_LINE}.5 points?`,
    description: ``,
    outcomes: [
      NO_CONTEST,
      `${NAMING_TEAM.AWAY_TEAM} ${NAMING_LINE.SPREAD_LINE}.5`,
      `${NAMING_TEAM.HOME_TEAM} ${NAMING_LINE.SPREAD_LINE}.5`,
    ],
  },
  [SPORTS_MARKET_TYPE.OVER_UNDER]: {
    title: `Will there be over ${NAMING_LINE.OVER_UNDER_LINE}.5 total points scored?`,
    description: `${NAMING_TEAM.AWAY_TEAM} vs ${NAMING_TEAM.HOME_TEAM}`,
    outcomes: [NO_CONTEST, `Over ${NAMING_LINE.OVER_UNDER_LINE}.5`, `Under ${NAMING_LINE.OVER_UNDER_LINE}.5`],
  },
};

// TODO: Rules might change depending on how contract resolves over/under MMA markets, need to verify after contract is written
const sportsResolutionRules = {
  [SPORTS_MARKET_TYPE.MONEY_LINE]: [
    `At least 55 minutes of play must have elapsed for the game to be deemed official. If the game is not played or if less than 55 minutes of play have been completed, the game is not considered
    an official game and the market should resolve as 'No Contest'.`,
    `Overtime counts towards settlement purposes.`,
    `If the game ends in a tie, the market should resolve as 'No Contest'`,
    `If the game is not played, the market should resolve as 'No Contest'.`,
    `Results are determined by their natural conclusion and do not recognize postponed games,
    protests, or overturned decisions.`,
  ],
  [SPORTS_MARKET_TYPE.SPREAD]: [
    `At least 55 minutes of play must have elapsed for the game to be deemed official. If the game is
not played or if less than 55 minutes of play have been completed, the game is not considered
an official game and the market should resolve as 'No Contest'.`,
    `Overtime counts towards settlement purposes.`,
    `If the game is not played, the market should resolve as 'No Contest'.`,
    `Results are determined by their natural conclusion and do not recognize postponed games,
protests, or overturned decisions.`,
  ],
  [SPORTS_MARKET_TYPE.OVER_UNDER]: [
    `At least 55 minutes of play must have elapsed for the game to be deemed official. If the game is
not played or if less than 55 minutes of play have been completed, the game is not considered
an official game and the market should resolve as 'No Contest'.`,
    `Overtime count towards settlement purposes.`,
    `If the game is not played, the market should resolve as 'No Contest'.`,
    `Results are determined by their natural conclusion and do not recognize postponed games,
protests, or overturned decisions.`,
  ],
};
