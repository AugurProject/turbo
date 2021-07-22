// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;
pragma abicoder v2;

import "./Sport.sol";

abstract contract TokenNamesFromTeams is Sport {
    uint256 constant Away = 1;
    uint256 constant Home = 2;

    function makeSportsMarket(
        string memory _noContestName,
        string memory _homeTeamName,
        string memory _awayTeamName,
        uint256[] memory _odds
    ) internal returns (uint256) {
        string[] memory _outcomeNames = makeOutcomeNames(_noContestName, _homeTeamName, _awayTeamName);
        return startMarket(msg.sender, _outcomeNames, _odds, true);
    }

    function makeOutcomeNames(
        string memory _noContestName,
        string memory _homeTeamName,
        string memory _awayTeamName
    ) private pure returns (string[] memory _names) {
        _names = new string[](3);
        _names[NoContest] = _noContestName;
        _names[Away] = _awayTeamName;
        _names[Home] = _homeTeamName;
    }
}
