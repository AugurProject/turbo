import { BigNumber as BN } from "bignumber.js";
import { INVALID_OUTCOME_ID } from "./constants";

export const getOutcomeName = (
  index: number,
  sportId: string,
  homeTeam: string,
  awayTeam: string,
  sportsMarketType: number,
  line: string
) => {
  // create outcome name using market type and line
  if (index === INVALID_OUTCOME_ID) return "No Contest";

  if (sportsMarketType === 0) {
    // head to head (money line)
    if (index === 1) return homeTeam;
    if (index === 2) return awayTeam;
  }

  if (sportsMarketType === 1) {
    // spread
    if (index === 1) return `${homeTeam} ${line}.5`;
    if (index === 2) return `${awayTeam} ${line}.5`;
  }

  if (sportsMarketType === 2) {
    // over/under
    if (index === 1) return `Over ${line}.5`;
    if (index === 2) return `Under ${line}.5`;
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
  let title = "";
  let description = "";
  if (sportsMarketType === 0) {
    // head to head (money line)
    title = `Which team will win?`;
    description = `${awayTeam} @ ${homeTeam}?`;
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
    title = `Will the ${fav} beat the ${underdog} by more than ${spread}.5 points?`;
  }

  if (sportsMarketType === 2) {
    // over/under
    title = `Will there be over ${line}.5 total points scored?`;
    description = `${awayTeam} vs ${homeTeam}`;
  }
  return { title, description };
};
