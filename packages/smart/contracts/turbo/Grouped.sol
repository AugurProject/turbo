// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;
pragma abicoder v2;

import "./AbstractMarketFactoryV3.sol";
import "../libraries/CalculateLinesToBPoolOdds.sol";
import "./GroupFetcher.sol";

abstract contract Grouped is AbstractMarketFactoryV3, CalculateLinesToBPoolOdds {
    event GroupCreated(uint256 indexed id, uint256 endTime, uint256 invalidMarketId, string invalidMarketName);
    event GroupMarketAdded(uint256 indexed groupId, uint256 marketId, string marketName);
    event GroupFinalizing(uint256 indexed groupId, uint256 winningMarketIndex);
    event GroupResolved(uint256 indexed id, bool valid);

    enum GroupStatus {Unknown, Scheduled, Finalizing, Final, Invalid}

    struct MarketGroup {
        GroupStatus status;
        string name;
        uint256[] markets;
        string[] marketNames;
        uint256 invalidMarket;
        string invalidMarketName;
        uint256 endTime;
        string category;
        uint256 winningMarketIndex; // ignore when status is Scheduled. MAX_UINT is invalid
    }
    // GroupId => MarketGroup
    mapping(uint256 => MarketGroup) public marketGroups;
    uint256[] public listOfMarketGroups;

    // For regular markets, YES means the team won and NO means the team did not win.
    // For the invalid market, YES means none of the teams won and NO means a team won.
    uint256 constant OUTCOME_NO = 0;
    uint256 constant OUTCOME_YES = 1;

    uint256 constant MAX_UINT = 2**256 - 1;

    function groupCount() public view returns (uint256) {
        return listOfMarketGroups.length;
    }

    function getGroup(uint256 _groupId) public view returns (MarketGroup memory) {
        return marketGroups[_groupId];
    }

    function getGroupByIndex(uint256 _index) public view returns (MarketGroup memory _group, uint256 _groupId) {
        _groupId = listOfMarketGroups[_index];
        _group = getGroup(_groupId);
    }

    function startCreatingMarketGroup(
        uint256 _groupId,
        string memory _groupName,
        uint256 _endTime,
        string memory _invalidMarketName,
        string memory _category
    ) internal {
        require(marketGroups[_groupId].status == GroupStatus.Unknown, "group exists");

        listOfMarketGroups.push(_groupId);
        marketGroups[_groupId].status = GroupStatus.Scheduled;
        marketGroups[_groupId].name = _groupName;
        marketGroups[_groupId].endTime = _endTime;
        marketGroups[_groupId].category = _category;

        uint256 _invalidMarket = startMarket(msg.sender, buildOutcomesNames(_invalidMarketName), invalidOdds(), true);
        marketGroups[_groupId].invalidMarket = _invalidMarket;
        marketGroups[_groupId].invalidMarketName = _invalidMarketName;

        emit GroupCreated(_groupId, _endTime, _invalidMarket, _invalidMarketName);
        emit GroupMarketAdded(_groupId, _invalidMarket, _invalidMarketName);
    }

    function addMarketToMarketGroup(
        uint256 _groupId,
        string memory _marketName,
        uint256[] memory _odds
    ) internal {
        require(marketGroups[_groupId].status == GroupStatus.Scheduled, "group must be Scheduled");

        uint256 _marketId = startMarket(msg.sender, buildOutcomesNames(_marketName), _odds, true);
        marketGroups[_groupId].markets.push(_marketId);
        marketGroups[_groupId].marketNames.push(_marketName);
        emit GroupMarketAdded(_groupId, _marketId, _marketName);
    }

    // Use MAX_UINT for _winningMarketIndex to indicate INVALID
    function startResolvingMarketGroup(uint256 _groupId, uint256 _winningMarketIndex) internal {
        bool _isInvalid = _winningMarketIndex == MAX_UINT;
        MarketGroup memory _group = marketGroups[_groupId];

        require(_group.status == GroupStatus.Scheduled, "group not Scheduled");

        resolveInvalidMarket(_group, _isInvalid);
        marketGroups[_groupId].status = GroupStatus.Finalizing;
        marketGroups[_groupId].winningMarketIndex = _winningMarketIndex;
        emit GroupFinalizing(_groupId, _winningMarketIndex);
    }

    function resolveFinalizingGroupMarket(uint256 _groupId, uint256 _marketIndex) internal {
        MarketGroup memory _group = marketGroups[_groupId];
        require(_group.status == GroupStatus.Finalizing, "must be finalizing");

        uint256 _marketId = _group.markets[_marketIndex];
        bool _wins = _marketIndex == _group.winningMarketIndex;
        resolveGroupMarket(_marketId, _wins);
    }

    function finalizeMarketGroup(uint256 _groupId) internal {
        MarketGroup storage _group = marketGroups[_groupId];
        require(_group.status == GroupStatus.Finalizing);

        bool _valid = _group.winningMarketIndex != MAX_UINT;

        _group.status = _valid ? GroupStatus.Final : GroupStatus.Invalid;

        emit GroupResolved(_groupId, _valid);
    }

    function resolveGroupMarket(uint256 _marketId, bool _wins) internal {
        uint256 _winningOutcome = _wins ? OUTCOME_YES : OUTCOME_NO;
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
