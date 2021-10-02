// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;
pragma abicoder v2;

import "./Fetcher.sol";
import "./Grouped.sol";

abstract contract GroupFetcher is Fetcher {
    struct SpecificMarketFactoryBundle {
        MarketFactoryBundle super;
    }

    struct StaticGroupBundle {
        uint256 id;
        string name;
        StaticMarketBundle[] markets;
        string[] marketNames;
        StaticMarketBundle invalidMarket;
        string invalidMarketName;
        uint256 endTime;
        string category;
        // Dynamics
        Grouped.GroupStatus status;
    }

    struct DynamicGroupBundle {
        uint256 id;
        Grouped.GroupStatus status;
        DynamicMarketBundle[] markets;
        DynamicMarketBundle invalidMarket;
    }

    function buildSpecificMarketFactoryBundle(address _marketFactory)
        internal
        view
        returns (SpecificMarketFactoryBundle memory _bundle)
    {
        _bundle.super = buildMarketFactoryBundle(AbstractMarketFactoryV3(_marketFactory));
    }

    function fetchInitial(
        address _marketFactory,
        AMMFactory _ammFactory,
        MasterChef _masterChef,
        uint256 _offset,
        uint256 _total
    )
        public
        view
        returns (
            SpecificMarketFactoryBundle memory _marketFactoryBundle,
            StaticGroupBundle[] memory _groupBundles,
            uint256 _lowestGroupIndex,
            uint256 _timestamp
        )
    {
        _marketFactoryBundle = buildSpecificMarketFactoryBundle(_marketFactory);
        (_groupBundles, _lowestGroupIndex) = buildStaticGroupBundles(
            _marketFactory,
            _ammFactory,
            _masterChef,
            _offset,
            _total
        );
        _timestamp = block.timestamp;
    }

    function fetchDynamic(
        address _marketFactory,
        AMMFactory _ammFactory,
        uint256 _offset,
        uint256 _total
    )
        public
        view
        returns (
            DynamicGroupBundle[] memory _bundles,
            uint256 _lowestGroupIndex,
            uint256 _timestamp
        )
    {
        (_bundles, _lowestGroupIndex) = buildDynamicGroupBundles(_marketFactory, _ammFactory, _offset, _total);
        _timestamp = block.timestamp;
    }

    function buildStaticGroupBundles(
        address _marketFactory,
        AMMFactory _ammFactory,
        MasterChef _masterChef,
        uint256 _offset,
        uint256 _total
    ) internal view returns (StaticGroupBundle[] memory _bundles, uint256 _lowestGroupIndex) {
        uint256[] memory _groupIds;
        (_groupIds, _lowestGroupIndex) = listOfInterestingGroups(_marketFactory, _offset, _total);

        _total = _groupIds.length;
        _bundles = new StaticGroupBundle[](_total);
        for (uint256 i; i < _total; i++) {
            _bundles[i] = buildStaticGroupBundle(_marketFactory, _ammFactory, _masterChef, _groupIds[i]);
        }
    }

    function buildDynamicGroupBundles(
        address _marketFactory,
        AMMFactory _ammFactory,
        uint256 _offset,
        uint256 _total
    ) internal view returns (DynamicGroupBundle[] memory _bundles, uint256 _lowestGroupIndex) {
        uint256[] memory _groupIds;
        (_groupIds, _lowestGroupIndex) = listOfInterestingGroups(_marketFactory, _offset, _total);

        _total = _groupIds.length;
        _bundles = new DynamicGroupBundle[](_total);
        for (uint256 i; i < _total; i++) {
            _bundles[i] = buildDynamicGroupBundle(_marketFactory, _ammFactory, _groupIds[i]);
        }
    }

    function buildStaticGroupBundle(
        address _marketFactory,
        AMMFactory _ammFactory,
        MasterChef _masterChef,
        uint256 _groupId
    ) internal view returns (StaticGroupBundle memory _bundle) {
        Grouped.MarketGroup memory _group = Grouped(_marketFactory).getGroup(_groupId);

        StaticMarketBundle[] memory _markets = new StaticMarketBundle[](_group.markets.length);
        for (uint256 i = 0; i < _markets.length; i++) {
            _markets[i] = buildStaticMarketBundle(
                AbstractMarketFactoryV3(_marketFactory),
                _ammFactory,
                _masterChef,
                _group.markets[i]
            );
        }

        _bundle.id = _groupId;
        _bundle.name = _group.name;
        _bundle.status = _group.status;
        _bundle.markets = _markets;
        _bundle.endTime = _group.endTime;
        _bundle.invalidMarket = buildStaticMarketBundle(
            AbstractMarketFactoryV3(_marketFactory),
            _ammFactory,
            _masterChef,
            _group.invalidMarket
        );
        _bundle.invalidMarketName = _group.invalidMarketName;
        _bundle.marketNames = _group.marketNames;
        _bundle.category = _group.category;
    }

    function buildDynamicGroupBundle(
        address _marketFactory,
        AMMFactory _ammFactory,
        uint256 _groupId
    ) internal view returns (DynamicGroupBundle memory _bundle) {
        Grouped.MarketGroup memory _group = Grouped(_marketFactory).getGroup(_groupId);

        DynamicMarketBundle[] memory _markets = new DynamicMarketBundle[](_group.markets.length);
        for (uint256 i = 0; i < _markets.length; i++) {
            _markets[i] = buildDynamicMarketBundle(
                AbstractMarketFactoryV3(_marketFactory),
                _ammFactory,
                _group.markets[i]
            );
        }

        _bundle.id = _groupId;
        _bundle.markets = _markets;
        _bundle.invalidMarket = buildDynamicMarketBundle(
            AbstractMarketFactoryV3(_marketFactory),
            _ammFactory,
            _group.invalidMarket
        );
        _bundle.status = _group.status;
    }

    // Starts from the end of the groups list because newer groups are more interesting.
    // _offset is skipping all groups, not just interesting groups
    function listOfInterestingGroups(
        address _marketFactory,
        uint256 _offset,
        uint256 _total
    ) internal view returns (uint256[] memory _interestingGroupIds, uint256 _groupIndex) {
        _interestingGroupIds = new uint256[](_total);

        uint256 _groupCount = Grouped(_marketFactory).groupCount();

        // No groups so return nothing. (needed to avoid integer underflow below)
        if (_groupCount == 0) {
            return (new uint256[](0), 0);
        }

        uint256 _max = _groupCount;

        // No remaining groups so return nothing. (needed to avoid integer underflow below)
        if (_offset > _max) {
            return (new uint256[](0), 0);
        }

        uint256 _collectedGroups = 0;
        _groupIndex = _max - _offset;
        while (true) {
            if (_collectedGroups >= _total) break;
            if (_groupIndex == 0) break;

            _groupIndex--; // starts out one too high, so this works

            (Grouped.MarketGroup memory _group, uint256 _groupId) =
                Grouped(_marketFactory).getGroupByIndex(_groupIndex);

            if (isGroupInteresting(_group, AbstractMarketFactoryV3(_marketFactory))) {
                _interestingGroupIds[_collectedGroups] = _groupId;
                _collectedGroups++;
            }
        }

        if (_total > _collectedGroups) {
            assembly {
                // shortens array
                mstore(_interestingGroupIds, _collectedGroups)
            }
        }
    }

    function isGroupInteresting(Grouped.MarketGroup memory _group, AbstractMarketFactoryV3 _marketFactory)
        private
        view
        returns (bool)
    {
        for (uint256 i = 0; i < _group.markets.length; i++) {
            uint256 _marketId = _group.markets[i];
            if (openOrHasWinningShares(_marketFactory, _marketId)) {
                return true;
            }
        }
        if (openOrHasWinningShares(_marketFactory, _group.invalidMarket)) {
            return true;
        }

        return false;
    }
}

contract GroupedFetcher is GroupFetcher {
    constructor() Fetcher("Grouped", "TBD") {}
}
