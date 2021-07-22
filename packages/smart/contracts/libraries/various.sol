// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;
pragma abicoder v2;

import "./SafeMathUint256.sol";
import "./SafeMathInt256.sol";
import "./IERC20Full.sol";

import "../balancer/BPool.sol";
import "../turbo/AbstractMarketFactoryV3.sol";

abstract contract Linked is AbstractMarketFactoryV3 {
    event LinkNodeChanged(address newLinkNode);

    address public linkNode;

    constructor(address _linkNode) {
        linkNode = _linkNode;
    }

    function setLinkNode(address _newLinkNode) external onlyOwner {
        linkNode = _newLinkNode;
        emit LinkNodeChanged(_newLinkNode);
    }

    modifier onlyLinkNode() {
        require(msg.sender == linkNode);
        _;
    }
}

abstract contract Linear {
    function build1Line() internal pure returns (int256[] memory _lines) {
        _lines = new int256[](1);
    }

    function build3Lines(int256 _homeSpread, int256 _totalScore) internal pure returns (int256[] memory _lines) {
        _lines = new int256[](3);
        // 0 is the Head-to-Head market, which has no lines
        _lines[1] = addHalfPoint(_homeSpread);
        _lines[2] = addHalfPoint(_totalScore);
    }

    function addHalfPoint(int256 _line) private pure returns (int256) {
        // The line is a quantity of tenths. So 55 is 5.5 and -6 is -60.
        // If the line is a whole number then make it a half point more extreme, to eliminate ties.
        // So 50 becomes 55, -60 becomes -65, and 0 becomes 5.
        if (_line >= 0 && _line % 10 == 0) {
            return _line + 5;
        } else if (_line < 0 && (-_line) % 10 == 0) {
            return _line - 5;
        } else {
            return _line;
        }
    }
}

abstract contract Eventual is AbstractMarketFactoryV3, Linear {
    event SportsEventCreated(
        uint256 id,
        uint256[] markets,
        int256[] lines,
        uint256 homeTeamId,
        uint256 awayTeamId,
        string homeTeamName,
        string awayTeamName,
        uint256 estimatedStartTime
    );

    enum SportsEventStatus {Unknown, Scheduled, Final, Postponed, Canceled}
    struct SportsEvent {
        SportsEventStatus status;
        uint256[] markets;
        int256[] lines;
        uint256 estimatedStartTime;
        uint256 homeTeamId;
        uint256 awayTeamId;
        string homeTeamName;
        string awayTeamName;
        uint256 homeScore;
        uint256 awayScore;
    }
    // EventId => EventDetails
    mapping(uint256 => SportsEvent) public sportsEvents;
    uint256[] public listOfSportsEvents;

    uint256 constant NoContest = 0;

    function eventCount() public view returns (uint256) {
        return listOfSportsEvents.length;
    }

    function getSportsEvent(uint256 _eventId) public view returns (SportsEvent memory) {
        return sportsEvents[_eventId];
    }

    function getSportsEventByIndex(uint256 _index) public view returns (SportsEvent memory _event, uint256 _eventId) {
        _eventId = listOfSportsEvents[_index];
        _event = getSportsEvent(_eventId);
    }

    function makeSportsEvent(
        uint256 _eventId,
        uint256[] memory _markets,
        int256[] memory _lines,
        uint256 _estimatedStartTime,
        uint256 _homeTeamId,
        uint256 _awayTeamId,
        string memory _homeTeamName,
        string memory _awayTeamName
    ) internal {
        listOfSportsEvents.push(_eventId);
        sportsEvents[_eventId].status = SportsEventStatus.Scheduled; // new events must be Scheduled
        sportsEvents[_eventId].markets = _markets;
        sportsEvents[_eventId].lines = _lines;
        sportsEvents[_eventId].estimatedStartTime = _estimatedStartTime;
        sportsEvents[_eventId].homeTeamId = _homeTeamId;
        sportsEvents[_eventId].awayTeamId = _awayTeamId;
        sportsEvents[_eventId].homeTeamName = _homeTeamName;
        sportsEvents[_eventId].awayTeamName = _awayTeamName;
        // homeScore and awayScore default to zero, which is correct for new events

        emit SportsEventCreated(
            _eventId,
            _markets,
            _lines,
            _homeTeamId,
            _awayTeamId,
            _homeTeamName,
            _awayTeamName,
            _estimatedStartTime
        );
    }

    uint256 constant WhoWonUnknown = 0;
    uint256 constant WhoWonHome = 1;
    uint256 constant WhoWonAway = 2;
    uint256 constant WhoWonDraw = 3;

    function eventIsNoContest(
        SportsEvent memory _event,
        SportsEventStatus _eventStatus,
        uint256 _homeTeamId,
        uint256 _awayTeamId,
        uint256 _whoWon // pass in WhoWonUnknown if using a scoring sport
    ) internal pure returns (bool) {
        bool _draw = _whoWon == WhoWonDraw;
        bool _notFinal = _eventStatus != SportsEventStatus.Final;
        bool _unstableHomeTeamId = _event.homeTeamId != _homeTeamId;
        bool _unstableAwayTeamId = _event.awayTeamId != _awayTeamId;
        return _draw || _notFinal || _unstableHomeTeamId || _unstableAwayTeamId;
    }

    function resolveInvalidEvent(uint256 _eventId) internal {
        uint256[] memory _marketIds = sportsEvents[_eventId].markets;
        for (uint256 i = 0; i < _marketIds.length; i++) {
            uint256 _marketId = _marketIds[i];
            if (_marketId == 0) continue; // skip non-created markets
            endMarket(_marketId, NoContest);
        }
    }

    // TODO is this needed- getSportsEvent should do the same
    function getEventMarkets(uint256 _eventId) public view returns (uint256[] memory _markets) {
        uint256[] storage _original = sportsEvents[_eventId].markets;
        uint256 _len = _original.length;
        _markets = new uint256[](_len);
        for (uint256 i = 0; i < _len; i++) {
            _markets[i] = _original[i];
        }
    }
}

// TODO change this to work with the Fetcher contracts and use it there, since it's offchain-read-only.
abstract contract EventualView is Eventual {
    // Only usable off-chain. Gas cost can easily eclipse block limit.
    // Lists all events that could be resolved with a call to resolveEvent.
    // Not all will be resolvable because this does not ensure the game ended.
    function listResolvableEvents() external view returns (uint256[] memory) {
        uint256 _totalResolvable = countResolvableEvents();
        uint256[] memory _resolvableEvents = new uint256[](_totalResolvable);

        uint256 n = 0;
        for (uint256 i = 0; i < listOfSportsEvents.length; i++) {
            if (n > _totalResolvable) break;
            uint256 _eventId = listOfSportsEvents[i];
            if (isEventResolvable(_eventId)) {
                _resolvableEvents[n] = _eventId;
                n++;
            }
        }

        return _resolvableEvents;
    }

    function countResolvableEvents() internal view returns (uint256) {
        uint256 _totalResolvable = 0;
        for (uint256 i = 0; i < listOfSportsEvents.length; i++) {
            uint256 _eventId = listOfSportsEvents[i];
            if (isEventResolvable(_eventId)) {
                _totalResolvable++;
            }
        }
        return _totalResolvable;
    }

    // Returns true if a call to resolveEvent is potentially useful.
    function isEventResolvable(uint256 _eventId) internal view returns (bool) {
        uint256[] memory _markets = getEventMarkets(_eventId);

        bool _unresolved = false; // default because non-existing markets aren't resolvable
        for (uint256 i = 0; i < _markets.length; i++) {
            uint256 _marketId = _markets[i];
            if (_marketId != 0 && !isMarketResolved(_marketId)) {
                _unresolved = true;
                break;
            }
        }

        return _unresolved;
    }
}

abstract contract CalculateLinesToBPoolOdds {
    using SafeMathUint256 for uint256;
    using SafeMathInt256 for int256;

    uint256 constant MAX_BPOOL_WEIGHT = 50e18;

    function ratioOdds(uint256[] memory _proportions) internal pure returns (uint256[] memory _odds) {
        uint256 _total = sum(_proportions);

        _odds = new uint256[](_proportions.length);
        for (uint256 i = 0; i < _proportions.length; i++) {
            _odds[i] = (MAX_BPOOL_WEIGHT).mul(_proportions[i]).div(_total);
            require(_odds[i] >= 1e18, "min outcome weight is 2%");
        }
    }

    function sum(uint256[] memory _numbers) private pure returns (uint256 _sum) {
        for (uint256 i = 0; i < _numbers.length; i++) {
            _sum += _numbers[i];
        }
    }

    function evenOdds(bool _invalid, uint256 _outcomes) internal pure returns (uint256[] memory _odds) {
        uint256 _size = _outcomes + (_invalid ? 1 : 0);
        _odds = new uint256[](_size);

        if (_invalid) _odds[0] = 1e18; // 2%

        uint256 _each = (_invalid ? 49e18 : 50e18) / _outcomes;
        for (uint256 i = _invalid ? 1 : 0; i < _size; i++) {
            _odds[i] = _each;
        }
    }

    function oddsFromLines(int256 _moneyline1, int256 _moneyline2) internal pure returns (uint256[] memory _odds) {
        uint256 _odds1 = __calcLineToOdds(_moneyline1);
        uint256 _odds2 = __calcLineToOdds(_moneyline2);

        uint256 _total = _odds1 + _odds2;

        _odds1 = uint256(49e18).mul(_odds1).div(_total);
        _odds2 = uint256(49e18).mul(_odds2).div(_total);

        // Moneyline odds are too skewed: would have under 2% odds.
        require(_odds1 >= 1e18);
        require(_odds2 >= 1e18);

        _odds = new uint256[](3);
        _odds[0] = 1e18; // Invalid, 2%
        _odds[1] = _odds1;
        _odds[2] = _odds2;
    }

    function __calcLineToOdds(int256 _line) internal pure returns (uint256) {
        if (_line < 0) {
            // favored
            uint256 _posLine = uint256(-_line);
            return _posLine.mul(49e18).div(_posLine.add(100)); // 49e18 * _line / (_line + 100)
        } else {
            // underdog
            return uint256(4900e18).div(uint256(_line).add(100)); // 49e18 * 100 / (_line + 100)
        }
    }
}

abstract contract UsesScores is Eventual, Linked {
    function resolveEvent(
        uint256 _eventId,
        SportsEventStatus _eventStatus,
        uint256 _homeTeamId, // for verifying team stability
        uint256 _awayTeamId, // for verifying team stability
        uint256 _homeScore,
        uint256 _awayScore
    ) public onlyLinkNode {
        SportsEvent storage _event = sportsEvents[_eventId];

        require(_event.status == SportsEventStatus.Scheduled);
        require(SportsEventStatus(_eventStatus) != SportsEventStatus.Scheduled);

        if (eventIsNoContest(_event, _eventStatus, _homeTeamId, _awayTeamId, WhoWonUnknown)) {
            resolveInvalidEvent(_eventId);
        } else {
            resolveValidEvent(_event, _homeScore, _awayScore);
        }

        sportsEvents[_eventId].status = _eventStatus;
    }

    function resolveValidEvent(
        SportsEvent memory _event,
        uint256 _homeScore,
        uint256 _awayScore
    ) internal virtual;
}

abstract contract SaysWhoWon is Eventual, Linked {
    function resolveEvent(
        uint256 _eventId,
        SportsEventStatus _eventStatus,
        uint256 _homeTeamId, // for verifying team stability
        uint256 _awayTeamId, // for verifying team stability
        uint256 _whoWon
    ) public onlyLinkNode {
        SportsEvent storage _event = sportsEvents[_eventId];

        require(_event.status == SportsEventStatus.Scheduled);
        require(SportsEventStatus(_eventStatus) != SportsEventStatus.Scheduled);

        if (eventIsNoContest(_event, _eventStatus, _homeTeamId, _awayTeamId, _whoWon)) {
            resolveInvalidEvent(_eventId);
        } else {
            resolveValidEvent(_event, _whoWon);
        }

        sportsEvents[_eventId].status = _eventStatus;
    }

    function resolveValidEvent(SportsEvent memory _event, uint256 _whoWon) internal virtual;
}

abstract contract TokenNamesFromTeams is Eventual {
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

abstract contract Facing is AbstractMarketFactoryV3, Eventual, CalculateLinesToBPoolOdds, TokenNamesFromTeams {
    using SafeMathUint256 for uint256;
    using SafeMathInt256 for int256;

    uint256 private headToHeadMarketType;
    string private noContestName;

    uint256 constant HeadToHeadAway = 1;
    uint256 constant HeadToHeadHome = 2;

    constructor(uint256 _marketType, string memory _noContestName) {
        headToHeadMarketType = _marketType;
        noContestName = _noContestName;
    }

    function makeHeadToHeadMarket(
        int256[2] memory _moneylines,
        string memory _homeTeamName,
        string memory _awayTeamName
    ) internal returns (uint256) {
        // moneylines is [home,away] but the outcomes are listed [NC,away,home] so they must be reversed
        return
            makeSportsMarket(
                noContestName,
                _homeTeamName,
                _awayTeamName,
                oddsFromLines(_moneylines[1], _moneylines[0])
            );
    }

    function resolveHeadToHeadMarket(
        uint256 _marketId,
        uint256 _homeScore,
        uint256 _awayScore
    ) internal {
        uint256 _shareTokenIndex = calcHeadToHeadWinner(_homeScore, _awayScore);
        endMarket(_marketId, _shareTokenIndex);
    }

    function calcHeadToHeadWinner(uint256 _homeScore, uint256 _awayScore) private pure returns (uint256) {
        if (_homeScore > _awayScore) {
            return HeadToHeadHome;
        } else if (_homeScore < _awayScore) {
            return HeadToHeadAway;
        } else {
            return NoContest;
        }
    }
}

abstract contract Spreadable is AbstractMarketFactoryV3, Eventual, CalculateLinesToBPoolOdds, TokenNamesFromTeams {
    using SafeMathUint256 for uint256;
    using SafeMathInt256 for int256;

    uint256 private spreadMarketType;
    string private noContestName;

    uint256 constant SpreadAway = 1;
    uint256 constant SpreadHome = 2;

    constructor(uint256 _marketType, string memory _noContestName) {
        spreadMarketType = _marketType;
        noContestName = _noContestName;
    }

    function makeSpreadMarket(string memory _homeTeamName, string memory _awayTeamName) internal returns (uint256) {
        return makeSportsMarket(noContestName, _homeTeamName, _awayTeamName, evenOdds(true, 2));
    }

    function resolveSpreadMarket(
        uint256 _marketId,
        int256 _line,
        uint256 _homeScore,
        uint256 _awayScore
    ) internal {
        uint256 _shareTokenIndex = calcSpreadWinner(_homeScore, _awayScore, _line);
        endMarket(_marketId, _shareTokenIndex);
    }

    function calcSpreadWinner(
        uint256 _homeScore,
        uint256 _awayScore,
        int256 _targetSpread
    ) internal pure returns (uint256) {
        int256 _actualSpread = int256(_homeScore).sub(int256(_awayScore));

        if (_actualSpread > _targetSpread) {
            return SpreadHome; // home spread greater
        } else if (_actualSpread < _targetSpread) {
            return SpreadAway; // away spread lesser
        } else {
            // draw / tie; some sports eliminate this with half-points
            return NoContest;
        }
    }
}

abstract contract Hurdlable is AbstractMarketFactoryV3, Eventual, CalculateLinesToBPoolOdds {
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

abstract contract Versioned {
    string internal version;

    constructor(string memory _version) {
        version = _version;
    }

    function getVersion() public view returns (string memory) {
        return version;
    }
}
