// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;
pragma abicoder v2;

import "./AbstractMarketFactoryV3.sol";
import "./FeePot.sol";
import "../libraries/SafeMathInt256.sol";
import "./Grouped.sol";
import "../libraries/ManagedByLink.sol";
import "../libraries/Versioned.sol";


contract FuturesMarketFactory is AbstractMarketFactoryV3, Grouped, ManagedByLink, Versioned {
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
        string memory _invalidMarketName,
        uint256 _endTime
    ) public onlyLinkNode {
        require(marketGroups[_groupId].status == GroupStatus.Unknown);
        startCreatingMarketGroup(_groupId, _endTime, _invalidMarketName);
    }

    function addOutcomesToGroup(
        uint256 _groupId,
        string[] memory _marketNames,
        uint256[][] memory _odds
    ) public onlyLinkNode {
        require(marketGroups[_groupId].status == GroupStatus.BeingCreated);
        require(_marketNames.length == _odds.length);

        for (uint256 i = 0; i < _marketNames.length; i++) {
            addMarketToMarketGroup(_groupId, _marketNames[i], _odds[i]);
        }
    }

    function finalizeGroup(uint256 _groupId) public onlyLinkNode {
        finalizeMarketGroup(_groupId);
    }

    // Set _winner to MAX_UINT (2*256 - 1) to indicate invalid
    function resolveGroup(uint256 _groupId, uint256 _winningMarketIndex) public onlyLinkNode {
        MarketGroup memory _group = marketGroups[_groupId];

        // Group must be exist and be scheduled.
        require(_group.status == GroupStatus.Scheduled);

        resolveMarketGroup(_groupId, _winningMarketIndex);
    }

    // Used when some markets in a group can resolve early as NO.
    // ex: Teams eliminated early from a tournament cannot win the overall tournament.
    function resolveMarketAsNo(uint256 _marketId) public onlyLinkNode {
        require(markets[_marketId].active, "market inactive");
        resolveGroupMarket(_marketId, false);
    }
}
