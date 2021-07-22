// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;
pragma abicoder v2;

import "../turbo/AbstractMarketFactoryV3.sol";
import "./Sport.sol";
import "./CalculateLinesToBPoolOdds.sol";
import "./TokenNamesFromTeams.sol";

abstract contract HasHeadToHeadMarket is
    AbstractMarketFactoryV3,
    Sport,
    CalculateLinesToBPoolOdds,
    TokenNamesFromTeams
{
    using SafeMathUint256 for uint256;
    using SafeMathInt256 for int256;

    uint256 private headToHeadMarketType;
    string private noContestName;

    uint256 constant HeadToHeadAway = 1;
    uint256 constant HeadToHeadHome = 2;

    constructor(uint256 _marketType, string memory _noContestName) {
        headToHeadMarketType = _marketType;
        noContestName = _noContestName;
    }

    function makeHeadToHeadMarket(
        int256[2] memory _moneylines,
        string memory _homeTeamName,
        string memory _awayTeamName
    ) internal returns (uint256) {
        // moneylines is [home,away] but the outcomes are listed [NC,away,home] so they must be reversed
        return
            makeSportsMarket(
                noContestName,
                _homeTeamName,
                _awayTeamName,
                oddsFromLines(_moneylines[1], _moneylines[0])
            );
    }

    function resolveHeadToHeadMarket(
        uint256 _marketId,
        uint256 _homeScore,
        uint256 _awayScore
    ) internal {
        uint256 _shareTokenIndex = calcHeadToHeadWinner(_homeScore, _awayScore);
        endMarket(_marketId, _shareTokenIndex);
    }

    function calcHeadToHeadWinner(uint256 _homeScore, uint256 _awayScore) private pure returns (uint256) {
        if (_homeScore > _awayScore) {
            return HeadToHeadHome;
        } else if (_homeScore < _awayScore) {
            return HeadToHeadAway;
        } else {
            return NoContest;
        }
    }
}
