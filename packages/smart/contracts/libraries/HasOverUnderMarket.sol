// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;
pragma abicoder v2;

import "../turbo/AbstractMarketFactoryV3.sol";
import "./Sport.sol";
import "./CalculateLinesToBPoolOdds.sol";

abstract contract HasOverUnderMarket is AbstractMarketFactoryV3, Sport, CalculateLinesToBPoolOdds {
    using SafeMathUint256 for uint256;
    using SafeMathInt256 for int256;

    uint256 private overUnderMarketType;
    string private noContestName;

    uint256 constant Over = 1;
    uint256 constant Under = 2;

    constructor(uint256 _marketType, string memory _noContestName) {
        overUnderMarketType = _marketType;
        noContestName = _noContestName;
    }

    function makeOverUnderMarket() internal returns (uint256) {
        string[] memory _outcomeNames = makeOutcomeNames(noContestName);
        return startMarket(msg.sender, _outcomeNames, evenOdds(true, 2), true);
    }

    function resolveOverUnderMarket(
        uint256 _marketId,
        int256 _line,
        uint256 _homeScore,
        uint256 _awayScore
    ) internal {
        uint256 _shareTokenIndex = calcOverUnderWinner(_homeScore, _awayScore, _line);
        endMarket(_marketId, _shareTokenIndex);
    }

    function calcOverUnderWinner(
        uint256 _homeScore,
        uint256 _awayScore,
        int256 _targetTotal
    ) internal pure returns (uint256) {
        int256 _actualTotal = int256(_homeScore).add(int256(_awayScore));

        if (_actualTotal > _targetTotal) {
            return Over; // total score above than line
        } else if (_actualTotal < _targetTotal) {
            return Under; // total score below line
        } else {
            return NoContest; // draw / tie; some sports eliminate this with half-points
        }
    }

    function makeOutcomeNames(string memory _noContestName) private pure returns (string[] memory _names) {
        _names = new string[](3);
        _names[NoContest] = _noContestName;
        _names[Over] = "Over";
        _names[Under] = "Under";
    }
}
