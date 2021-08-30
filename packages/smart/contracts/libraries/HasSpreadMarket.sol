// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;
pragma abicoder v2;

import "../turbo/AbstractMarketFactoryV3.sol";
import "./Sport.sol";
import "./CalculateLinesToBPoolOdds.sol";
import "./TokenNamesFromTeams.sol";

abstract contract HasSpreadMarket is AbstractMarketFactoryV3, Sport, CalculateLinesToBPoolOdds, TokenNamesFromTeams {
    using SafeMathUint256 for uint256;
    using SafeMathInt256 for int256;

    uint256 private spreadMarketType;
    string private noContestName;

    uint256 constant SpreadAway = 1;
    uint256 constant SpreadHome = 2;

    constructor(uint256 _marketType, string memory _noContestName) {
        spreadMarketType = _marketType;
        noContestName = _noContestName;
    }

    function makeSpreadMarket(string memory _homeTeamName, string memory _awayTeamName) internal returns (uint256) {
        return makeSportsMarket(noContestName, _homeTeamName, _awayTeamName, evenOdds(true, 2));
    }

    function resolveSpreadMarket(
        uint256 _marketId,
        int256 _line,
        uint256 _homeScore,
        uint256 _awayScore
    ) internal {
        uint256 _shareTokenIndex = calcSpreadWinner(_homeScore, _awayScore, _line);
        endMarket(_marketId, _shareTokenIndex);
    }

    function calcSpreadWinner(
        uint256 _homeScore,
        uint256 _awayScore,
        int256 _targetSpread
    ) internal pure returns (uint256) {
        int256 _actualSpread = int256(_homeScore).sub(int256(_awayScore));

        if (_actualSpread > _targetSpread) {
            return SpreadHome; // home spread greater
        } else if (_actualSpread < _targetSpread) {
            return SpreadAway; // away spread lesser
        } else {
            // draw / tie; some sports eliminate this with half-points
            return NoContest;
        }
    }
}
