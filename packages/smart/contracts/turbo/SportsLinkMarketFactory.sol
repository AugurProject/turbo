// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;
pragma abicoder v2;

import "../libraries/IERC20Full.sol";
import "../balancer/BPool.sol";
import "./AbstractMarketFactory.sol";
import "./FeePot.sol";
import "../libraries/SafeMathInt256.sol";

contract SportsLinkMarketFactory is AbstractMarketFactory {
    using SafeMathUint256 for uint256;
    using SafeMathInt256 for int256;

    event MarketCreated(
        uint256 id,
        address creator,
        uint256 endTime,
        MarketType marketType,
        uint256 indexed eventId,
        uint256 homeTeamId,
        uint256 awayTeamId,
        uint256 estimatedStartTime,
        int256 score
    );
    event MarketResolved(uint256 id, address winner);
    event LinkNodeChanged(address newLinkNode);

    enum MarketType {HeadToHead, Spread, OverUnder}
    enum HeadToHeadOutcome {
        NoContest, // 0
        Away, // 1
        Home // 2
    }
    enum SpreadOutcome {
        NoContest, // 0
        Away, // 1
        Home // 2
    }
    enum OverUnderOutcome {
        NoContest, // 0
        Over, // 1
        Under // 2
    }
    struct MarketDetails {
        uint256 eventId;
        uint256 homeTeamId;
        uint256 awayTeamId;
        uint256 estimatedStartTime;
        MarketType marketType;
        EventStatus eventStatus;
        // This value depends on the marketType.
        // HeadToHead: ignored
        // Spread: the home team spread
        // OverUnder: total score in game
        int256 value0;
    }
    // MarketId => MarketDetails
    mapping(uint256 => MarketDetails) internal marketDetails;

    enum EventStatus {Unknown, Scheduled, Final, Postponed, Canceled}
    struct EventDetails {
        uint256[3] markets;
        uint256 startTime;
        uint256 homeScore;
        uint256 awayScore;
        EventStatus status;
        // If there is a resolution time then the market is resolved but not necessarily finalized.
        // A market is finalized when its last two score updates were identical.
        // Score updates must occur after a period of time spedcified by resolutionBuffer.
        // This mechanism exists to reduce the risk of bad scores being sent by the API then later corrected.
        // The downside is slower resolution.
        uint256 resolutionTime; // time since last score update
        bool finalized; // true after event resolves and has stable scores
    }
    // EventId => EventDetails
    mapping(uint256 => EventDetails) public events;
    uint256[] public listOfEvents;

    address public linkNode;
    uint256 public sportId = 4; // not used for anything

    constructor(
        string memory _version,
        address _owner,
        IERC20Full _collateral,
        uint256 _shareFactor,
        FeePot _feePot,
        uint256 _stakerFee,
        uint256 _settlementFee,
        address _protocol,
        uint256 _protocolFee,
        address _linkNode
    )
        AbstractMarketFactory(
            _version,
            _owner,
            _collateral,
            _shareFactor,
            _feePot,
            _stakerFee,
            _settlementFee,
            _protocol,
            _protocolFee
        )
    {
        linkNode = _linkNode;
    }

    function createMarket(
        uint256 _eventId,
        uint256 _homeTeamId,
        uint256 _awayTeamId,
        uint256 _startTimestamp,
        int256 _homeSpread,
        uint256 _totalScore,
        bool _makeSpread,
        bool _makeTotalScore
    ) public returns (uint256[3] memory _ids) {
        require(msg.sender == linkNode, "Only link node can create markets");

        address _creator = msg.sender;
        uint256 _endTime = _startTimestamp.add(60 * 8); // 8 hours

        _ids = events[_eventId].markets;

        if (_ids[0] == 0) {
            _ids[0] = createHeadToHeadMarket(_creator, _endTime, _eventId, _homeTeamId, _awayTeamId, _startTimestamp);
        }

        if (_ids[1] == 0 && _makeSpread) {
            // spread market hasn't been created and is ready to be created
            _ids[1] = createSpreadMarket(
                _creator,
                _endTime,
                _eventId,
                _homeTeamId,
                _awayTeamId,
                _startTimestamp,
                _homeSpread
            );
        }

        if (_ids[2] == 0 && _makeTotalScore) {
            // over-under market hasn't been created and is ready to be created
            _ids[2] = createOverUnderMarket(
                _creator,
                _endTime,
                _eventId,
                _homeTeamId,
                _awayTeamId,
                _startTimestamp,
                _totalScore
            );
        }

        events[_eventId].status = EventStatus.Scheduled;
        events[_eventId].startTime = _startTimestamp;
        events[_eventId].markets = _ids;
        listOfEvents.push(_eventId);
    }

    function createHeadToHeadMarket(
        address _creator,
        uint256 _endTime,
        uint256 _eventId,
        uint256 _homeTeamId,
        uint256 _awayTeamId,
        uint256 _startTimestamp
    ) internal returns (uint256) {
        string[] memory _outcomes = new string[](3);
        _outcomes[uint256(HeadToHeadOutcome.NoContest)] = "No Contest";
        _outcomes[uint256(HeadToHeadOutcome.Away)] = "Away";
        _outcomes[uint256(HeadToHeadOutcome.Home)] = "Home";

        uint256 _id = markets.length;
        markets.push(makeMarket(_creator, _outcomes, _outcomes, _endTime));
        marketDetails[_id] = MarketDetails(
            _eventId,
            _homeTeamId,
            _awayTeamId,
            _startTimestamp,
            MarketType.HeadToHead,
            EventStatus.Scheduled,
            0
        );
        emit MarketCreated(
            _id,
            _creator,
            _endTime,
            MarketType.HeadToHead,
            _eventId,
            _homeTeamId,
            _awayTeamId,
            _startTimestamp,
            0
        );
        return _id;
    }

    function createSpreadMarket(
        address _creator,
        uint256 _endTime,
        uint256 _eventId,
        uint256 _homeTeamId,
        uint256 _awayTeamId,
        uint256 _startTimestamp,
        int256 _homeSpread
    ) internal returns (uint256) {
        string[] memory _outcomes = new string[](3);
        _outcomes[uint256(SpreadOutcome.NoContest)] = "No Contest";
        _outcomes[uint256(SpreadOutcome.Away)] = "Away";
        _outcomes[uint256(SpreadOutcome.Home)] = "Home";

        // The spread is a quantity of tenths. So 55 is 5.5 and -6 is -60.
        // If the spread is a whole number then make it a half point more extreme, to eliminate ties.
        // So 50 becomes 55, -60 becomes -65, and 0 becomes 5.
        if (_homeSpread >= 0 && _homeSpread % 10 == 0) {
            _homeSpread += 5;
        } else if (_homeSpread < 0 && (-_homeSpread) % 10 == 0) {
            _homeSpread -= 5;
        }

        uint256 _id = markets.length;
        markets.push(makeMarket(_creator, _outcomes, _outcomes, _endTime));
        marketDetails[_id] = MarketDetails(
            _eventId,
            _homeTeamId,
            _awayTeamId,
            _startTimestamp,
            MarketType.Spread,
            EventStatus.Scheduled,
            _homeSpread
        );
        emit MarketCreated(
            _id,
            _creator,
            _endTime,
            MarketType.Spread,
            _eventId,
            _homeTeamId,
            _awayTeamId,
            _startTimestamp,
            _homeSpread
        );
        return _id;
    }

    function createOverUnderMarket(
        address _creator,
        uint256 _endTime,
        uint256 _eventId,
        uint256 _homeTeamId,
        uint256 _awayTeamId,
        uint256 _startTimestamp,
        uint256 _overUnderTotal
    ) internal returns (uint256) {
        string[] memory _outcomes = new string[](3);
        _outcomes[uint256(OverUnderOutcome.NoContest)] = "No Contest";
        _outcomes[uint256(OverUnderOutcome.Over)] = "Over";
        _outcomes[uint256(OverUnderOutcome.Under)] = "Under";

        // The total is a quantity of tenths. So 55 is 5.5 and -6 is -60.
        // If the total is a whole number then make it a half point higher, to eliminate ties.
        // So 50 becomes 55 and 0 becomes 5.
        if (_overUnderTotal >= 0 && _overUnderTotal % 10 == 0) {
            _overUnderTotal += 5;
        }

        uint256 _id = markets.length;
        markets.push(makeMarket(_creator, _outcomes, _outcomes, _endTime));
        marketDetails[_id] = MarketDetails(
            _eventId,
            _homeTeamId,
            _awayTeamId,
            _startTimestamp,
            MarketType.OverUnder,
            EventStatus.Scheduled,
            int256(_overUnderTotal)
        );
        emit MarketCreated(
            _id,
            _creator,
            _endTime,
            MarketType.OverUnder,
            _eventId,
            _homeTeamId,
            _awayTeamId,
            _startTimestamp,
            int256(_overUnderTotal)
        );
        return _id;
    }

    function resolveMarket(uint256) public pure override {
        require(false, "Only the link node can resolve the market, using trustedResolveMarkets");
    }

    function trustedResolveMarkets(
        uint256 _eventId,
        uint256 _eventStatus,
        uint256 _homeScore,
        uint256 _awayScore
    ) public {
        require(msg.sender == linkNode, "Only link node can resolve markets");

        EventDetails storage _event = events[_eventId];
        uint256[3] memory _ids = _event.markets;

        require(_ids[0] != 0 || _ids[1] != 0 || _ids[2] != 0, "Cannot resolve markets that weren't created");

        require(EventStatus(_eventStatus) != EventStatus.Scheduled, "cannot resolve SCHEDULED markets");

        // resolve markets as No Contest
        if (EventStatus(_eventStatus) != EventStatus.Final) {
            for (uint256 i = 0; i < _ids.length; i++) {
                uint256 _id = _ids[i];
                if (_id == 0) continue; // skip non-created markets
                OwnedERC20 _winner = markets[_id].shareTokens[0]; // 0th outcome is No Contest for all market types
                markets[_id].winner = _winner;
                emit MarketResolved(_id, address(_winner));
            }
            return;
        }

        // only resolve markets that were created
        if (_ids[0] != 0) {
            resolveHeadToHeadMarket(_ids[0], _homeScore, _awayScore);
        }
        if (_ids[1] != 0) {
            resolveSpreadMarket(_ids[1], _homeScore, _awayScore);
        }
        if (_ids[2] != 0) {
            resolveOverUnderMarket(_ids[2], _homeScore, _awayScore);
        }
    }

    function resolveHeadToHeadMarket(
        uint256 _id,
        uint256 _homeScore,
        uint256 _awayScore
    ) internal {
        OwnedERC20 _winner;
        if (_homeScore > _awayScore) {
            _winner = markets[_id].shareTokens[uint256(HeadToHeadOutcome.Home)]; // home team won
        } else if (_homeScore < _awayScore) {
            _winner = markets[_id].shareTokens[uint256(HeadToHeadOutcome.Away)]; // away team won
        } else {
            _winner = markets[_id].shareTokens[uint256(HeadToHeadOutcome.NoContest)]; // no contest
        }

        markets[_id].winner = _winner;
        emit MarketResolved(_id, address(_winner));
    }

    function resolveSpreadMarket(
        uint256 _id,
        uint256 _homeScore,
        uint256 _awayScore
    ) internal {
        MarketDetails memory _details = marketDetails[_id];
        int256 _targetSpread = _details.value0;

        int256 _actualSpread = int256(_homeScore).sub(int256(_awayScore));

        OwnedERC20 _winner;
        if (_actualSpread > _targetSpread) {
            _winner = markets[_id].shareTokens[uint256(SpreadOutcome.Home)]; // home spread greater
        } else if (_actualSpread < _targetSpread) {
            _winner = markets[_id].shareTokens[uint256(SpreadOutcome.Away)]; // home spread lesser
        } else {
            _winner = markets[_id].shareTokens[uint256(SpreadOutcome.NoContest)]; // no contest
        }

        markets[_id].winner = _winner;
        emit MarketResolved(_id, address(_winner));
    }

    function resolveOverUnderMarket(
        uint256 _id,
        uint256 _homeScore,
        uint256 _awayScore
    ) internal {
        MarketDetails memory _details = marketDetails[_id];
        int256 _targetTotal = _details.value0;

        int256 _actualTotal = int256(_homeScore).add(int256(_awayScore));

        OwnedERC20 _winner;
        if (_actualTotal > _targetTotal) {
            _winner = markets[_id].shareTokens[uint256(OverUnderOutcome.Over)]; // over
        } else if (_actualTotal < _targetTotal) {
            _winner = markets[_id].shareTokens[uint256(OverUnderOutcome.Under)]; // under
        } else {
            _winner = markets[_id].shareTokens[uint256(OverUnderOutcome.NoContest)]; // no contest
        }

        markets[_id].winner = _winner;
        emit MarketResolved(_id, address(_winner));
    }

    function getMarketDetails(uint256 _marketId) public view returns (MarketDetails memory) {
        return marketDetails[_marketId];
    }

    function setLinkNode(address _newLinkNode) external onlyOwner {
        linkNode = _newLinkNode;
        emit LinkNodeChanged(_newLinkNode);
    }

    function getEventMarkets(uint256 _eventId) external view returns (uint256[3] memory) {
        uint256[3] memory _event = events[_eventId].markets;
        return _event;
    }

    // Events can be partially registered, by only creating some markets.
    // This returns true only if an event is fully registered.
    function isEventRegistered(uint256 _eventId) public view returns (bool) {
        uint256[3] memory _event = events[_eventId].markets;
        return _event[0] != 0 && _event[1] != 0 && _event[2] != 0;
    }

    function isEventResolved(uint256 _eventId) public view returns (bool) {
        // check the event's head-to-head market since it will always exist if the event's markets exist
        uint256 _marketId = events[_eventId].markets[0];
        return isMarketResolved(_marketId);
    }

    // Only usable off-chain. Gas cost can easily eclipse block limit.
    // Lists all events that could be resolved with a call to resolveEvent.
    // Not all will be resolvable because this does not ensure the game ended.
    function listResolvableEvents() external view returns (uint256[] memory) {
        uint256 _totalResolvable = countResolvableEvents();
        uint256[] memory _resolvableEvents = new uint256[](_totalResolvable);

        uint256 n = 0;
        for (uint256 i = 0; i < listOfEvents.length; i++) {
            if (n > _totalResolvable) break;
            uint256 _eventId = listOfEvents[i];
            if (isEventResolvable(_eventId)) {
                _resolvableEvents[n] = _eventId;
                n++;
            }
        }

        return _resolvableEvents;
    }

    function countResolvableEvents() internal view returns (uint256) {
        uint256 _totalResolvable = 0;
        for (uint256 i = 0; i < listOfEvents.length; i++) {
            uint256 _eventId = listOfEvents[i];
            if (isEventResolvable(_eventId)) {
                _totalResolvable++;
            }
        }
        return _totalResolvable;
    }

    // Returns true if a call to resolveEvent is potentially useful.
    function isEventResolvable(uint256 _eventId) internal view returns (bool) {
        EventDetails memory _event = events[_eventId];

        bool _unresolved = false; // default because non-existing markets aren't resolvable
        for (uint256 i = 0; i < _event.markets.length; i++) {
            uint256 _marketId = _event.markets[i];
            if (_marketId != 0 && !isMarketResolved(_marketId)) {
                _unresolved = true;
                break;
            }
        }

        return _unresolved;
    }
}
