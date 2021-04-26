import { BigNumber as BN } from "bignumber.js";
import { NO_CONTEST_OUTCOME_ID } from "./constants";

const SPORTS_MARKET_TYPE = {
  MONEY_LINE: 0,
  SPREAD: 1,
  OVER_UNDER: 2,
};
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
const NO_CONTEST_TIE = "Tie/No Contest";

export const getOutcomeName = (
  index: number,
  sportId: string,
  homeTeam: string,
  awayTeam: string,
  sportsMarketType: number,
  line: string
) => {
  const marketOutcome = getMarketOutcome(sportId, sportsMarketType, index);
  // create outcome name using market type and line
  if (index === NO_CONTEST_OUTCOME_ID) return marketOutcome;

  if (sportsMarketType === 0) {
    return populateHomeAway(marketOutcome, homeTeam, awayTeam);
  }

  if (sportsMarketType === 1) {
    // spread
    let pLine = line;
    if (index === 2) {
      pLine = String(Number(line) * -1); // invert for away team
    }
    return populateHomeAway(marketOutcome, homeTeam, awayTeam).replace(NAMING_LINE.SPREAD_LINE, pLine);
  }

  if (sportsMarketType === 2) {
    // over/under
    return marketOutcome.replace(NAMING_LINE.OVER_UNDER_LINE, line);
  }

  return `Outcome ${index}`;
};

// todo: move this to own file when new market factory is available
export const getMarketTitle = (
  sportId: string,
  homeTeam: string,
  awayTeam: string,
  sportsMarketType: number,
  line: string
): { title: string; description: string } => {
  const marketTitles = getSportsTitles(sportId, sportsMarketType);
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

  if (sportsMarketType === 1) {
    // spread
    let fav = homeTeam;
    let underdog = awayTeam;
    // todo: figure out which team is fav and underdog
    if (Number(line) < 0) {
      underdog = homeTeam;
      fav = awayTeam;
    }
    let spread = new BN(line).abs().toNumber();
    if (!Number.isInteger(spread)) {
      spread = Math.trunc(spread);
    }
    title = marketTitles.title
      .replace(NAMING_TEAM.FAV_TEAM, fav)
      .replace(NAMING_TEAM.UNDERDOG_TEAM, underdog)
      .replace(NAMING_LINE.SPREAD_LINE, String(spread));
  }

  if (sportsMarketType === 2) {
    // over/under
    title = marketTitles.title.replace(NAMING_LINE.OVER_UNDER_LINE, line);
    description = populateHomeAway(marketTitles.description, homeTeam, awayTeam);
  }
  return { title, description };
};

const populateHomeAway = (marketTitle: string, homeTeam: string, awayTeam: string): string => {
  return marketTitle.replace(NAMING_TEAM.AWAY_TEAM, awayTeam).replace(NAMING_TEAM.HOME_TEAM, homeTeam);
};

const getSportsTitles = (sportId: string, sportsMarketType: number): { title: string; description: string } => {
  if (!sportsData[sportId]) return null;
  return sportsData[sportId]?.types[sportsMarketType];
};

const getMarketOutcome = (sportId: string, sportsMarketType: number, outcomeId: number): string => {
  if (!sportsData[sportId]) {
    console.error(`sport ${sportId} not found in collection`);
    return "";
  }
  const data = sportsData[sportId]?.types[sportsMarketType];
  if (!data?.outcomes) {
    console.error(`${sportsMarketType} not found in ${sportId} outcomes data`);
    return "";
  }
  return data.outcomes[outcomeId];
};

const sportsData = {
  "2": {
    name: "NFL",
    types: {
      [SPORTS_MARKET_TYPE.MONEY_LINE]: {
        title: `Which team will win?`,
        description: `${NAMING_TEAM.AWAY_TEAM} vs ${NAMING_TEAM.HOME_TEAM}?`,
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
    },
  },
  "3": {
    name: "MLB",
    types: {
      [SPORTS_MARKET_TYPE.MONEY_LINE]: {
        title: `Which team will win?`,
        description: `${NAMING_TEAM.AWAY_TEAM} vs ${NAMING_TEAM.HOME_TEAM}?`,
        outcomes: [NO_CONTEST, `${NAMING_TEAM.AWAY_TEAM}`, `${NAMING_TEAM.HOME_TEAM}`],
      },
      [SPORTS_MARKET_TYPE.SPREAD]: {
        title: `Will the ${NAMING_TEAM.FAV_TEAM} defeat the ${NAMING_TEAM.UNDERDOG_TEAM} by more than ${NAMING_LINE.SPREAD_LINE}.5 runs?`,
        description: ``,
        outcomes: [
          NO_CONTEST,
          `${NAMING_TEAM.AWAY_TEAM} ${NAMING_LINE.SPREAD_LINE}.5`,
          `${NAMING_TEAM.HOME_TEAM} ${NAMING_LINE.SPREAD_LINE}.5`,
        ],
      },
      [SPORTS_MARKET_TYPE.OVER_UNDER]: {
        title: `Will there be over ${NAMING_LINE.OVER_UNDER_LINE}.5 total runs scored?`,
        description: `${NAMING_TEAM.AWAY_TEAM} vs ${NAMING_TEAM.HOME_TEAM}`,
        outcomes: [NO_CONTEST, `Over ${NAMING_LINE.OVER_UNDER_LINE}.5`, `Under ${NAMING_LINE.OVER_UNDER_LINE}.5`],
      },
    },
  },
  "4": {
    name: "NBA",
    types: {
      [SPORTS_MARKET_TYPE.MONEY_LINE]: {
        title: `Which team will win?`,
        description: `${NAMING_TEAM.AWAY_TEAM} vs ${NAMING_TEAM.HOME_TEAM}?`,
        outcomes: [NO_CONTEST, `${NAMING_TEAM.AWAY_TEAM}`, `${NAMING_TEAM.HOME_TEAM}`],
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
    },
  },
  "6": {
    name: "NHL",
    types: {
      [SPORTS_MARKET_TYPE.MONEY_LINE]: {
        title: `Which team will win?`,
        description: `${NAMING_TEAM.AWAY_TEAM} vs ${NAMING_TEAM.HOME_TEAM}?`,
        outcomes: [NO_CONTEST, `${NAMING_TEAM.AWAY_TEAM}`, `${NAMING_TEAM.HOME_TEAM}`],
      },
      [SPORTS_MARKET_TYPE.SPREAD]: {
        title: `Will the ${NAMING_TEAM.FAV_TEAM} defeat the ${NAMING_TEAM.UNDERDOG_TEAM} by more than ${NAMING_LINE.SPREAD_LINE}.5 goals?`,
        description: ``,
        outcomes: [
          NO_CONTEST,
          `${NAMING_TEAM.AWAY_TEAM} ${NAMING_LINE.SPREAD_LINE}.5`,
          `${NAMING_TEAM.HOME_TEAM} ${NAMING_LINE.SPREAD_LINE}.5`,
        ],
      },
      [SPORTS_MARKET_TYPE.OVER_UNDER]: {
        title: `Will there be over ${NAMING_LINE.OVER_UNDER_LINE}.5 total goals scored?`,
        description: `${NAMING_TEAM.AWAY_TEAM} vs ${NAMING_TEAM.HOME_TEAM}`,
        outcomes: [NO_CONTEST, `Over ${NAMING_LINE.OVER_UNDER_LINE}.5`, `Under ${NAMING_LINE.OVER_UNDER_LINE}.5`],
      },
    },
  },
  "7": {
    name: "MMA",
    types: {
      [SPORTS_MARKET_TYPE.MONEY_LINE]: {
        title: `Who will win?`,
        description: `${NAMING_TEAM.HOME_TEAM} vs ${NAMING_TEAM.AWAY_TEAM}?`,
        outcomes: [NO_CONTEST, `${NAMING_TEAM.HOME_TEAM}`, `${NAMING_TEAM.AWAY_TEAM}`],
      },
      [SPORTS_MARKET_TYPE.SPREAD]: {
        title: ``,
        description: ``,
      },
      [SPORTS_MARKET_TYPE.OVER_UNDER]: {
        title: `Will fight go the distance?`,
        description: ``,
        outcomes: [NO_CONTEST, `Yes`, `No`],
      },
    },
  },
};
