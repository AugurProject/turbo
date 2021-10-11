// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;
pragma abicoder v2;

import "./Fetcher.sol";

contract SportsFetcher is Fetcher {
    struct SpecificMarketFactoryBundle {
        MarketFactoryBundle super;
    }

    struct StaticEventBundle {
        uint256 id;
        StaticMarketBundle[] markets;
        int256[] lines;
        uint256 estimatedStartTime;
        uint256 homeTeamId;
        uint256 awayTeamId;
        string homeTeamName;
        string awayTeamName;
        // Dynamics
        Sport.SportsEventStatus status;
        uint256 homeScore;
        uint256 awayScore;
    }

    struct DynamicEventBundle {
        uint256 id;
        Sport.SportsEventStatus status;
        DynamicMarketBundle[] markets;
        uint256 homeScore;
        uint256 awayScore;
    }

    constructor() Fetcher("Sports", "1.4") {}

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
            StaticEventBundle[] memory _eventBundles,
            uint256 _lowestEventIndex,
            uint256 _timestamp
        )
    {
        _marketFactoryBundle = buildSpecificMarketFactoryBundle(_marketFactory);
        (_eventBundles, _lowestEventIndex) = buildStaticEventBundles(
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
            DynamicEventBundle[] memory _bundles,
            uint256 _lowestEventIndex,
            uint256 _timestamp
        )
    {
        (_bundles, _lowestEventIndex) = buildDynamicEventBundles(_marketFactory, _ammFactory, _offset, _total);
        _timestamp = block.timestamp;
    }

    function buildStaticEventBundles(
        address _marketFactory,
        AMMFactory _ammFactory,
        MasterChef _masterChef,
        uint256 _offset,
        uint256 _total
    ) internal view returns (StaticEventBundle[] memory _bundles, uint256 _lowestEventIndex) {
        uint256[] memory _eventIds;
        (_eventIds, _lowestEventIndex) = listOfInterestingEvents(_marketFactory, _offset, _total);

        _total = _eventIds.length;
        _bundles = new StaticEventBundle[](_total);
        for (uint256 i; i < _total; i++) {
            _bundles[i] = buildStaticEventBundle(_marketFactory, _ammFactory, _masterChef, _eventIds[i]);
        }
    }

    function buildDynamicEventBundles(
        address _marketFactory,
        AMMFactory _ammFactory,
        uint256 _offset,
        uint256 _total
    ) internal view returns (DynamicEventBundle[] memory _bundles, uint256 _lowestEventIndex) {
        uint256[] memory _eventIds;
        (_eventIds, _lowestEventIndex) = listOfInterestingEvents(_marketFactory, _offset, _total);

        _total = _eventIds.length;
        _bundles = new DynamicEventBundle[](_total);
        for (uint256 i; i < _total; i++) {
            _bundles[i] = buildDynamicEventBundle(_marketFactory, _ammFactory, _eventIds[i]);
        }
    }

    function buildStaticEventBundle(
        address _marketFactory,
        AMMFactory _ammFactory,
        MasterChef _masterChef,
        uint256 _eventId
    ) internal view returns (StaticEventBundle memory _bundle) {
        Sport.SportsEvent memory _event = Sport(_marketFactory).getSportsEvent(_eventId);

        StaticMarketBundle[] memory _markets = new StaticMarketBundle[](_event.markets.length);
        for (uint256 i = 0; i < _markets.length; i++) {
            _markets[i] = buildStaticMarketBundle(
                AbstractMarketFactoryV3(_marketFactory),
                _ammFactory,
                _masterChef,
                _event.markets[i]
            );
        }

        _bundle.id = _eventId;
        _bundle.status = _event.status;
        _bundle.markets = _markets;
        _bundle.lines = _event.lines;
        _bundle.estimatedStartTime = _event.estimatedStartTime;
        _bundle.homeTeamId = _event.homeTeamId;
        _bundle.awayTeamId = _event.awayTeamId;
        _bundle.homeTeamName = _event.homeTeamName;
        _bundle.awayTeamName = _event.awayTeamName;
        _bundle.homeScore = _event.homeScore;
        _bundle.awayScore = _event.awayScore;
    }

    function buildDynamicEventBundle(
        address _marketFactory,
        AMMFactory _ammFactory,
        uint256 _eventId
    ) internal view returns (DynamicEventBundle memory _bundle) {
        Sport.SportsEvent memory _event = Sport(_marketFactory).getSportsEvent(_eventId);

        DynamicMarketBundle[] memory _markets = new DynamicMarketBundle[](_event.markets.length);
        for (uint256 i = 0; i < _markets.length; i++) {
            _markets[i] = buildDynamicMarketBundle(
                AbstractMarketFactoryV3(_marketFactory),
                _ammFactory,
                _event.markets[i]
            );
        }

        _bundle.id = _eventId;
        _bundle.markets = _markets;
        _bundle.status = _event.status;
        _bundle.homeScore = _event.homeScore;
        _bundle.awayScore = _event.awayScore;
    }

    // Starts from the end of the events list because newer events are more interesting.
    // _offset is skipping all events, not just interesting events
    function listOfInterestingEvents(
        address _marketFactory,
        uint256 _offset,
        uint256 _total
    ) internal view returns (uint256[] memory _interestingEventIds, uint256 _eventIndex) {
        _interestingEventIds = new uint256[](_total);

        uint256 _eventCount = Sport(_marketFactory).eventCount();

        // No events so return nothing. (needed to avoid integer underflow below)
        if (_eventCount == 0) {
            return (new uint256[](0), 0);
        }

        uint256 _max = _eventCount;

        // No remaining events so return nothing. (needed to avoid integer underflow below)
        if (_offset > _max) {
            return (new uint256[](0), 0);
        }

        uint256 _collectedEvents = 0;
        _eventIndex = _max - _offset;
        while (true) {
            if (_collectedEvents >= _total) break;
            if (_eventIndex == 0) break;

            _eventIndex--; // starts out one too high, so this works

            (Sport.SportsEvent memory _event, uint256 _eventId) =
                Sport(_marketFactory).getSportsEventByIndex(_eventIndex);

            if (isEventInteresting(_event, AbstractMarketFactoryV3(_marketFactory))) {
                _interestingEventIds[_collectedEvents] = _eventId;
                _collectedEvents++;
            }
        }

        if (_total > _collectedEvents) {
            assembly {
                // shortens array
                mstore(_interestingEventIds, _collectedEvents)
            }
        }
    }

    function isEventInteresting(Sport.SportsEvent memory _event, AbstractMarketFactoryV3 _marketFactory)
        private
        view
        returns (bool)
    {
        for (uint256 i = 0; i < _event.markets.length; i++) {
            uint256 _marketId = _event.markets[i];
            if (openOrHasWinningShares(_marketFactory, _marketId)) {
                return true;
            }
        }
        return false;
    }

    //
    // Views to help event creation and resolution.
    //

    // Lists all events that could be resolved with a call to resolveEvent.
    // Not all will be resolvable because this does not ensure the event ended.
    function listResolvableEvents(
        address _marketFactory,
        uint256 _offset,
        uint256 _total
    ) external view returns (uint256[] memory _resolvableEvents, uint256 _eventIndex) {
        _resolvableEvents = new uint256[](_total);

        uint256 _eventCount = Sport(_marketFactory).eventCount();

        // No events so return nothing. (needed to avoid integer underflow below)
        if (_eventCount == 0) {
            return (new uint256[](0), 0);
        }

        uint256 _max = _eventCount;

        // No remaining events so return nothing. (needed to avoid integer underflow below)
        if (_offset > _max) {
            return (new uint256[](0), 0);
        }

        uint256 _collectedEvents = 0;
        _eventIndex = _max - _offset;
        while (true) {
            if (_collectedEvents >= _total) break;
            if (_eventIndex == 0) break;

            _eventIndex--; // starts out one too high, so this works

            (Sport.SportsEvent memory _event, uint256 _eventId) =
                Sport(_marketFactory).getSportsEventByIndex(_eventIndex);

            if (isEventResolvable(_event, AbstractMarketFactoryV3(_marketFactory))) {
                _resolvableEvents[_collectedEvents] = _eventId;
                _collectedEvents++;
            }
        }

        if (_total > _collectedEvents) {
            assembly {
                // shortens array
                mstore(_resolvableEvents, _collectedEvents)
            }
        }
    }

    // Returns true if a call to resolveEvent is potentially useful.
    function isEventResolvable(Sport.SportsEvent memory _event, AbstractMarketFactoryV3 _marketFactory)
        internal
        view
        returns (bool)
    {
        bool _unresolved = false; // default because non-existing markets aren't resolvable
        for (uint256 i = 0; i < _event.markets.length; i++) {
            uint256 _marketId = _event.markets[i];
            if (_marketId != 0 && !_marketFactory.isMarketResolved(_marketId)) {
                _unresolved = true;
                break;
            }
        }

        return _unresolved;
    }
}
