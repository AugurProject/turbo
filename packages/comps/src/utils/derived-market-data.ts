import * as SimpleSportsDailies from "./derived-simple-sport-dailies";
import * as MmaDailies from "./derived-mma-dailies";

const simpleDailiesSportIds = ["3", "4"]; // needed for when other sports come in
const mmaDailiesSportIds = ["7"];

export const getOutcomeName = (
  outcomeId: number,
  sportId: string,
  homeTeam: string,
  awayTeam: string,
  sportsMarketType: number,
  line: string
) => {
  if (mmaDailiesSportIds.includes(sportId)) return MmaDailies.getOutcomeName(outcomeId, sportId, homeTeam, awayTeam, sportsMarketType, line);
  return SimpleSportsDailies.getOutcomeName(outcomeId, sportId, homeTeam, awayTeam, sportsMarketType, line);
};

export const getMarketTitle = (
  sportId: string,
  homeTeam: string,
  awayTeam: string,
  sportsMarketType: number,
  line: string
): { title: string; description: string } => {
  if (mmaDailiesSportIds.includes(sportId)) return MmaDailies.getMarketTitle(sportId, homeTeam, awayTeam, sportsMarketType, line);
  return SimpleSportsDailies.getMarketTitle(sportId, homeTeam, awayTeam, sportsMarketType, line);
};

export const getSportsResolutionRules = (sportId: string, sportsMarketType: number): string[] => {
  if (mmaDailiesSportIds.includes(sportId)) return MmaDailies.getSportsResolutionRules(sportId, sportsMarketType);
  return SimpleSportsDailies.getSportsResolutionRules(sportId, sportsMarketType);
};
