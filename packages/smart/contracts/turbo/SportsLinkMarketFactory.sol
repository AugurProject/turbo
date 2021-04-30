// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;
pragma abicoder v2;

import "../libraries/IERC20Full.sol";
import "../balancer/BPool.sol";
import "./AbstractMarketFactory.sol";
import "./FeePot.sol";
import "../libraries/SafeMathInt256.sol";

contract SportsLinkMarketFactory is AbstractMarketFactory, Ownable {
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
        uint256 estimatedStarTime,
        int256 score
    );
    event MarketResolved(uint256 id, address winner);

    constructor(
        address _owner,
        IERC20Full _collateral,
        uint256 _shareFactor,
        FeePot _feePot,
        uint256 _stakerFee,
        uint256 _creatorFee
    ) AbstractMarketFactory(_collateral, _shareFactor, _feePot, _stakerFee, _creatorFee) {
        owner = _owner;
    }

    enum MarketType {HeadToHead, Spread, OverUnder}
    enum EventStatus {Unknown, Scheduled, Final, Postponed, Canceled}

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
    // EventId => [MarketId]
    mapping(uint256 => uint256[3]) internal events;

    function createMarket(bytes32 _payload) external onlyOwner returns (uint256[3] memory _ids) {
        (
            uint256 _eventId,
            uint256 _homeTeamId,
            uint256 _awayTeamId,
            uint256 _startTimestamp,
            int256 _homeSpread,
            uint256 _totalScore
        ) = decodeCreation(_payload);
        address _creator = msg.sender;
        uint256 _endTime = _startTimestamp.add(60 * 8); // 8 hours

        require(!isEventRegistered(_eventId), "Markets already created");

        _ids[0] = createHeadToHeadMarket(_creator, _endTime, _eventId, _homeTeamId, _awayTeamId, _startTimestamp);
        _ids[1] = createSpreadMarket(
            _creator,
            _endTime,
            _eventId,
            _homeTeamId,
            _awayTeamId,
            _startTimestamp,
            _homeSpread
        );
        _ids[2] = createOverUnderMarket(
            _creator,
            _endTime,
            _eventId,
            _homeTeamId,
            _awayTeamId,
            _startTimestamp,
            _totalScore
        );

        events[_eventId] = _ids;
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
        _outcomes[0] = "No Contest";
        _outcomes[1] = "Away";
        _outcomes[2] = "Home";

        uint256 _id = markets.length;
        markets.push(
            Market(
                _creator,
                createShareTokens(_outcomes, _outcomes, address(this)),
                _endTime,
                OwnedERC20(0),
                creatorFee
            )
        );
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
        _outcomes[0] = "No Contest";
        _outcomes[1] = "Away";
        _outcomes[2] = "Home";

        uint256 _id = markets.length;
        markets.push(
            Market(
                _creator,
                createShareTokens(_outcomes, _outcomes, address(this)),
                _endTime,
                OwnedERC20(0),
                creatorFee
            )
        );
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
        _outcomes[0] = "No Contest";
        _outcomes[1] = "Over";
        _outcomes[2] = "Under";

        uint256 _id = markets.length;
        markets.push(
            Market(
                _creator,
                createShareTokens(_outcomes, _outcomes, address(this)),
                _endTime,
                OwnedERC20(0),
                creatorFee
            )
        );
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
        require(false, "Only the TrustedMarketFactory owner can resolve the market, using trustedResolveMarkets");
    }

    function trustedResolveMarkets(bytes32 _payload) public onlyOwner {
        (uint256 _eventId, uint256 _eventStatus, uint256 _homeScore, uint256 _awayScore) = decodeResolution(_payload);
        uint256[3] memory _ids = events[_eventId];

        // resolve markets as No Contest
        if (EventStatus(_eventStatus) != EventStatus.Final) {
            for (uint256 i = 0; i < _ids.length; i++) {
                uint256 _id = _ids[0];
                markets[_id].winner = markets[_id].shareTokens[0];
            }
            return;
        }

        resolveHeadToHeadMarket(_ids[0], _homeScore, _awayScore);
        resolveSpreadMarket(_ids[1], _homeScore, _awayScore);
        resolveOverUnderMarket(_ids[2], _homeScore, _awayScore);
    }

    function resolveHeadToHeadMarket(
        uint256 _id,
        uint256 _homeScore,
        uint256 _awayScore
    ) internal {
        OwnedERC20 _winner;
        if (_homeScore > _awayScore) {
            _winner = markets[_id].shareTokens[2];
        } else if (_homeScore < _awayScore) {
            _winner = markets[_id].shareTokens[1];
        } else {
            _winner = markets[_id].shareTokens[0];
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
            _winner = markets[_id].shareTokens[2];
        } else if (_actualSpread < _targetSpread) {
            _winner = markets[_id].shareTokens[1];
        } else {
            _winner = markets[_id].shareTokens[0];
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
            _winner = markets[_id].shareTokens[2];
        } else if (_actualTotal < _targetTotal) {
            _winner = markets[_id].shareTokens[1];
        } else {
            _winner = markets[_id].shareTokens[0];
        }

        markets[_id].winner = _winner;
        emit MarketResolved(_id, address(_winner));
    }

    function getMarketDetails(uint256 _marketId) public view returns (MarketDetails memory) {
        return marketDetails[_marketId];
    }

    function isEventRegistered(uint256 _eventId) public view returns (bool) {
        // The first market id could be zero, so use another one that can't.
        return events[_eventId][2] != 0;
    }

    function isEventResolved(uint256 _eventId) public view returns (bool) {
        uint256 _marketId = events[_eventId][2];
        return isMarketResolved(_marketId);
    }

    function encodeCreation(
        uint128 _eventId,
        uint16 _homeTeamId,
        uint16 _awayTeamId,
        uint32 _startTimestamp,
        int16 _homeSpread,
        uint16 _totalScore
    ) external pure returns (bytes32 _payload) {
        bytes memory _a =
            abi.encodePacked(_eventId, _homeTeamId, _awayTeamId, _startTimestamp, _homeSpread, _totalScore);
        assembly {
            _payload := mload(add(_a, 32))
        }
    }

    function decodeCreation(bytes32 _payload)
        public
        pure
        returns (
            uint128 _eventId,
            uint16 _homeTeamId,
            uint16 _awayTeamId,
            uint32 _startTimestamp,
            int16 _homeSpread,
            uint16 _totalScore
        )
    {
        uint256 _temp = uint256(_payload);
        // prettier-ignore
        {
            _eventId        = uint128(_temp >> 128);
            _homeTeamId     = uint16((_temp << 128)                       >> (256 - 16));
            _awayTeamId     = uint16((_temp << (128 + 16))                >> (256 - 16));
            _startTimestamp = uint32((_temp << (128 + 16 + 16))           >> (256 - 32));
            _homeSpread     = int16 ((_temp << (128 + 16 + 16 + 32))      >> (256 - 16));
            _totalScore     = uint16((_temp << (128 + 16 + 16 + 32 + 16)) >> (256 - 16));
        }
    }

    function encodeResolution(
        uint128 _eventId,
        uint8 _eventStatus,
        uint16 _homeScore,
        uint16 _awayScore
    ) external pure returns (bytes32 _payload) {
        bytes memory _a = abi.encodePacked(_eventId, _eventStatus, _homeScore, _awayScore);
        assembly {
            _payload := mload(add(_a, 32))
        }
    }

    function decodeResolution(bytes32 _payload)
        public
        pure
        returns (
            uint128 _eventId,
            uint8 _eventStatus,
            uint16 _homeScore,
            uint16 _awayScore
        )
    {
        uint256 _temp = uint256(_payload);
        // prettier-ignore
        {
            _eventId     = uint128(_temp >> 128);
            _eventStatus = uint8 ((_temp << 128)            >> (256 - 8));
            _homeScore   = uint16((_temp << (128 + 8))      >> (256 - 16));
            _awayScore   = uint16((_temp << (128 + 8 + 16)) >> (256 - 16));
        }
    }

    function onTransferOwnership(address, address) internal override {}
}
