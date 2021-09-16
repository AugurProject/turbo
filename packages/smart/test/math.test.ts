import { expect } from "chai";
import { describe } from "mocha";

enum Winner {
  Home = "Home",
  Away = "Away",
  Draw = "Draw",
}

describe("Math", () => {
  describe("Spread", () => {
    [
      { home: 31, away: 29, spread: -7.5, winner: Winner.Away },
      { home: 50, away: 29, spread: -7.5, winner: Winner.Home },
      { home: 31, away: 29, spread: 7.5, winner: Winner.Home },
      { home: 50, away: 45, spread: 7.5, winner: Winner.Home },
      { home: 30, away: 38, spread: 7.5, winner: Winner.Away },
      { home: 30, away: 37, spread: 7.5, winner: Winner.Home },
      { home: 30, away: 37, spread: 7.0, winner: Winner.Draw },
      { home: 23, away: 20, spread: -3.0, winner: Winner.Draw },
      { home: 5, away: 1, spread: -9.0, winner: Winner.Away },
    ].forEach(({ home, away, spread, winner }) => {
      it(`calcSpreadWinner(home=${home}, away=${away}, spread=${spread}) => ${winner}`, () => {
        expect(calcSpreadWinner(home, away, spread)).to.equal(winner);
      });
    });
  });
});

function calcSpreadWinner(homeScore: number, awayScore: number, spread: number): Winner {
  homeScore += spread;

  if (homeScore > awayScore) {
    return Winner.Home; // home spread greater
  } else if (homeScore < awayScore) {
    return Winner.Away; // away spread lesser
  } else {
    // draw / tie; some sports eliminate this with half-points
    return Winner.Draw;
  }
}
