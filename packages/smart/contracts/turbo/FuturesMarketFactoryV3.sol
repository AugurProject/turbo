// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;
pragma abicoder v2;

import "./AbstractMarketFactoryV3.sol";
import "./FeePot.sol";
import "../libraries/SafeMathInt256.sol";
import "./Grouped.sol";
import "../libraries/ManagedByLink.sol";
import "../libraries/Versioned.sol";

contract FuturesMarketFactoryV3 is AbstractMarketFactoryV3, Grouped, ManagedByLink, Versioned {
    using SafeMathUint256 for uint256;
    using SafeMathInt256 for int256;

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
        Versioned("v1.2.0")
        ManagedByLink(_linkNode)
    {}

    function initializeGroup(
        uint256 _groupId,
        string memory _groupName,
        string memory _invalidMarketName,
        uint256 _endTime,
        string memory _category
    ) public onlyLinkNode {
        startCreatingMarketGroup(_groupId, _groupName, _endTime, _invalidMarketName, _category);
    }

    function addOutcomesToGroup(
        uint256 _groupId,
        string[] memory _marketNames,
        uint256[][] memory _odds
    ) public onlyLinkNode {
        require(_marketNames.length == _odds.length);

        for (uint256 i = 0; i < _marketNames.length; i++) {
            addMarketToMarketGroup(_groupId, _marketNames[i], _odds[i]);
        }
    }

    // Set _winner to MAX_UINT (2*256 - 1) to indicate invalid
    function beginResolvingGroup(uint256 _groupId, uint256 _winningMarketIndex) public onlyLinkNode {
        startResolvingMarketGroup(_groupId, _winningMarketIndex);
    }

    function resolveMarkets(uint256 _groupId, uint256[] memory _marketIndexes) public onlyLinkNode {
        MarketGroup memory _group = marketGroups[_groupId];
        require(_group.status == GroupStatus.Finalizing);

        for (uint256 i = 0; i < _marketIndexes.length; i++) {
            uint256 _marketIndex = _marketIndexes[i];
            uint256 _marketId = _group.markets[_marketIndex];
            if (isMarketResolved(_marketId)) continue; // skip resolved markets
            resolveFinalizingGroupMarket(_groupId, _marketIndex);
        }
    }

    function finalizeGroup(uint256 _groupId) public onlyLinkNode {
        finalizeMarketGroup(_groupId);
    }

    // Used when some markets in a group can resolve early as NO.
    // ex: Teams eliminated early from a tournament cannot win the overall tournament.
    function resolveMarketAsNo(uint256 _marketId) public onlyLinkNode {
        require(markets[_marketId].active, "market inactive");
        resolveGroupMarket(_marketId, false);
    }

    function getRewardEndTime(uint256 _eventId) public view override returns (uint256) {
        return 0;
    }
}
