// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;
pragma abicoder v2;

import "../libraries/IERC20Full.sol";
import "../balancer/BPool.sol";
import "./AbstractMarketFactoryV3.sol";
import "./FeePot.sol";
import "../libraries/SafeMathInt256.sol";
import "../libraries/Sport.sol";
import "../libraries/HasSpreadMarket.sol";
import "../libraries/ResolveByScore.sol";
import "../libraries/Versioned.sol";

contract NBAMarketFactoryV3 is AbstractMarketFactoryV3, SportView, HasSpreadMarket, ResolvesByScore, Versioned {
    using SafeMathUint256 for uint256;
    using SafeMathInt256 for int256;

    uint256 constant Spread = 0;
    string constant InvalidName = "No Contest";

    constructor(
        address _owner,
        IERC20Full _collateral,
        uint256 _shareFactor,
        FeePot _feePot,
        uint256[3] memory _fees,
        address _protocol,
        address _linkNode
    )
        AbstractMarketFactoryV3(_owner, _collateral, _shareFactor, _feePot, _fees, _protocol)
        Versioned("1.5.0")
        ManagedByLink(_linkNode)
        HasSpreadMarket(Spread, InvalidName)
    {}

    function createEvent(
        uint256 _eventId,
        string memory _homeTeamName,
        uint256 _homeTeamId,
        string memory _awayTeamName,
        uint256 _awayTeamId,
        uint256 _startTimestamp,
        int256 _homeSpread
    ) public onlyLinkNode returns (uint256[] memory _marketIds) {
        _marketIds = makeMarkets(_homeTeamName, _awayTeamName);
        makeSportsEvent(
            _eventId,
            _marketIds,
            makeLine(_homeSpread),
            _startTimestamp,
            _homeTeamId,
            _awayTeamId,
            _homeTeamName,
            _awayTeamName
        );
    }

    function makeMarkets(string memory _homeTeamName, string memory _awayTeamName)
        internal
        returns (uint256[] memory _marketIds)
    {
        _marketIds = new uint256[](1);
        _marketIds[Spread] = makeSpreadMarket(_homeTeamName, _awayTeamName);
    }

    function makeLine(int256 _homeSpread) internal pure returns (int256[] memory _line) {
        _line = build1Line();
        _line[0] = addHalfPoint(_homeSpread);
    }

    function resolveValidEvent(
        SportsEvent memory _event,
        uint256 _homeScore,
        uint256 _awayScore
    ) internal override {
        resolveSpreadMarket(_event.markets[Spread], _event.lines[Spread], _homeScore, _awayScore);
    }
}
