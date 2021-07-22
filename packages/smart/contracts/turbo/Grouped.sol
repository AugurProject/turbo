// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

import "./AbstractMarketFactoryV3.sol";
import "../libraries/CalculateLinesToBPoolOdds.sol";
pragma abicoder v2;


abstract contract Grouped is AbstractMarketFactoryV3, CalculateLinesToBPoolOdds {
    event GroupCreated(uint256 indexed id, uint256 endTime, uint256 invalidMarketId, string invalidMarketName);
    event GroupMarketAdded(uint256 indexed groupId, uint256 marketId, string marketName);
    event GroupReady(uint256 indexed id);
    event GroupResolved(uint256 indexed id, bool valid);

    enum GroupStatus {Unknown, BeingCreated, Scheduled, Final, Invalid}
    enum MarketType {Unknown, Regular, Invalid}

    struct MarketGroup {
        GroupStatus status;
        uint256[] markets;
        uint256 invalidMarket;
        string[] marketNames;
        uint256 endTime;
    }
    // GroupId => MarketGroup
    mapping(uint256 => MarketGroup) public marketGroups;
    uint256[] public listOfMarketGroups;

    // For regular markets, YES means the team won and NO means the team did not win.
    // For the invalid market, YES means none of the teams won and NO means a team won.
    uint256 constant OUTCOME_NO = 0;
    uint256 constant OUTCOME_YES = 1;

    uint256 constant MAX_UINT = 2**256 - 1;

    function getGroup(uint256 _groupId) external view returns (MarketGroup memory) {
        return marketGroups[_groupId];
    }

    function startCreatingMarketGroup(
        uint256 _groupId,
        uint256 _endTime,
        string memory _invalidMarketName
    ) internal {
        require(marketGroups[_groupId].status == GroupStatus.Unknown, "group exists");

        listOfMarketGroups.push(_groupId);
        marketGroups[_groupId].status = GroupStatus.BeingCreated; // new groups must be Scheduled
        marketGroups[_groupId].endTime = _endTime;

        uint256 _invalidMarket = startMarket(msg.sender, buildOutcomesNames(_invalidMarketName), invalidOdds(), false);
        marketGroups[_groupId].invalidMarket = _invalidMarket;

        emit GroupCreated(_groupId, _endTime, _invalidMarket, _invalidMarketName);
        emit GroupMarketAdded(_groupId, _invalidMarket, _invalidMarketName);
    }

    function addMarketToMarketGroup(
        uint256 _groupId,
        string memory _marketName,
        uint256[] memory _odds
    ) internal {
        require(marketGroups[_groupId].status == GroupStatus.BeingCreated, "group not being created");

        uint256 _marketId = startMarket(msg.sender, buildOutcomesNames(_marketName), _odds, false);
        marketGroups[_groupId].markets.push(_marketId);
        marketGroups[_groupId].marketNames.push(_marketName);
        emit GroupMarketAdded(_groupId, _marketId, _marketName);
    }

    function finalizeMarketGroup(uint256 _groupId) internal {
        MarketGroup storage _group = marketGroups[_groupId];
        _group.status = GroupStatus.Scheduled;
        markets[_group.invalidMarket].active = true;
        activateMarket(_group.invalidMarket);
        for (uint256 i = 0; i < _group.markets.length; i++) {
            activateMarket(_group.markets[i]);
        }
        emit GroupReady(_groupId);
    }

    // Use MAX_UINT for _winningMarketIndex to indicate INVALID
    function resolveMarketGroup(uint256 _groupId, uint256 _winningMarketIndex) internal {
        bool _isInvalid = _winningMarketIndex == MAX_UINT;

        MarketGroup memory _group = marketGroups[_groupId];
        resolveInvalidMarket(_group, _isInvalid);
        resolveRegularMarkets(_group, _winningMarketIndex);
        marketGroups[_groupId].status = _isInvalid ? GroupStatus.Invalid : GroupStatus.Final;
        emit GroupResolved(_groupId, !_isInvalid);
    }

    function resolveRegularMarkets(MarketGroup memory _group, uint256 _winningMarketIndex) private {
        for (uint256 i = 0; i < _group.markets.length; i++) {
            uint256 _marketId = _group.markets[i];
            if (isMarketResolved(_marketId)) continue; // skip resolved markets
            resolveGroupMarket(_marketId, _winningMarketIndex == i);
        }
    }

    function resolveGroupMarket(uint256 _marketId, bool _wins) internal {
        uint256 _winningOutcome;
        if (_wins) {
            _winningOutcome = OUTCOME_YES;
        } else {
            _winningOutcome = OUTCOME_NO;
        }
        endMarket(_marketId, _winningOutcome);
    }

    function resolveInvalidMarket(MarketGroup memory _group, bool _invalid) private {
        uint256 _outcomeIndex = _invalid ? OUTCOME_YES : OUTCOME_NO;
        endMarket(_group.invalidMarket, _outcomeIndex);
    }

    function buildOutcomesNames(string memory _marketName) internal pure returns (string[] memory _names) {
        _names = new string[](2);
        _names[OUTCOME_NO] = string(abi.encodePacked("NO - ", _marketName));
        _names[OUTCOME_YES] = string(abi.encodePacked("YES - ", _marketName));
    }

    function invalidOdds() private pure returns (uint256[] memory _odds) {
        _odds = new uint256[](2);
        _odds[OUTCOME_YES] = 1e18;
        _odds[OUTCOME_NO] = 49e18;
    }
}