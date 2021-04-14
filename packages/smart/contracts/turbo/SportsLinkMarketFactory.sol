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

    struct MarketDetails {
        uint256 homeTeamId;
        uint256 awayTeamId;
        uint256 estimatedStartTime;
        HeadToHeadMarketDetails headToHead;
        SpreadMarketDetails spread;
        OverUnderMarketDetails overUnder;
    }
    struct HeadToHeadMarketDetails {
        uint256 marketId;
    }
    struct SpreadMarketDetails {
        uint256 marketId;
        int256 homeSpread;
    }
    struct OverUnderMarketDetails {
        uint256 marketId;
        int256 overUnderTotal;
    }
    // EventId => MarketDetails
    mapping(uint256 => MarketDetails) internal marketDetails;

    function createMarket(
        address _creator,
        uint256 _endTime,
        uint256 _eventId,
        uint256 _homeTeamId,
        uint256 _awayTeamId,
        int256 _homeSpread,
        int256 _overUnderTotal,
        uint256 _estimatedStartTime // signal to AMMs to stop trading and prevent the adding of new liquidity
    ) public onlyOwner returns (uint256[3] memory _ids) {
        require(marketDetails[_eventId].estimatedStartTime == 0, "Markets already created");

        _ids[0] = createHeadToHeadMarket(_creator, _endTime, _eventId, _homeTeamId, _awayTeamId, _estimatedStartTime);
        _ids[1] = createSpreadMarket(
            _creator,
            _endTime,
            _eventId,
            _homeTeamId,
            _awayTeamId,
            _estimatedStartTime,
            _homeSpread
        );
        _ids[2] = createOverUnderMarket(
            _creator,
            _endTime,
            _eventId,
            _homeTeamId,
            _awayTeamId,
            _estimatedStartTime,
            _overUnderTotal
        );

        marketDetails[_eventId] = MarketDetails(
            _homeTeamId,
            _awayTeamId,
            _estimatedStartTime,
            HeadToHeadMarketDetails(_ids[0]),
            SpreadMarketDetails(_ids[1], _homeSpread),
            OverUnderMarketDetails(_ids[2], _overUnderTotal)
        );
    }

    function createHeadToHeadMarket(
        address _creator,
        uint256 _endTime,
        uint256 _eventId,
        uint256 _homeTeamId,
        uint256 _awayTeamId,
        uint256 _estimatedStartTime
    ) internal returns (uint256) {
        string[] memory _outcomes = new string[](3);
        _outcomes[0] = "No Contest";
        _outcomes[1] = "Away";
        _outcomes[2] = "Home";

        uint256 _id = markets.length;
        markets.push(Market(_creator, createShareTokens(_outcomes, _outcomes, address(this)), _endTime, OwnedERC20(0)));
        emit MarketCreated(
            _id,
            _creator,
            _endTime,
            MarketType.HeadToHead,
            _eventId,
            _homeTeamId,
            _awayTeamId,
            _estimatedStartTime,
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
        uint256 _estimatedStartTime,
        int256 _homeSpread
    ) internal returns (uint256) {
        string[] memory _outcomes = new string[](3);
        _outcomes[0] = "No Contest";
        _outcomes[1] = "Underdog";
        _outcomes[2] = "Favorite";

        uint256 _id = markets.length;
        markets.push(Market(_creator, createShareTokens(_outcomes, _outcomes, address(this)), _endTime, OwnedERC20(0)));
        emit MarketCreated(
            _id,
            _creator,
            _endTime,
            MarketType.Spread,
            _eventId,
            _homeTeamId,
            _awayTeamId,
            _estimatedStartTime,
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
        uint256 _estimatedStartTime,
        int256 _overUnderTotal
    ) internal returns (uint256) {
        string[] memory _outcomes = new string[](3);
        _outcomes[0] = "No Contest";
        _outcomes[1] = "Under";
        _outcomes[2] = "Over";

        uint256 _id = markets.length;
        markets.push(Market(_creator, createShareTokens(_outcomes, _outcomes, address(this)), _endTime, OwnedERC20(0)));
        emit MarketCreated(
            _id,
            _creator,
            _endTime,
            MarketType.OverUnder,
            _eventId,
            _homeTeamId,
            _awayTeamId,
            _estimatedStartTime,
            _overUnderTotal
        );
        return _id;
    }

    function resolveMarket(uint256) public pure override {
        require(false, "Only the TrustedMarketFactory owner can resolve the market, using trustedResolveMarkets");
    }

    function trustedResolveMarkets(
        uint256 _eventId,
        int256 _homeScore,
        int256 _awayScore
    ) public onlyOwner {
        MarketDetails memory _details = marketDetails[_eventId];
        resolveHeadToHeadMarket(_homeScore, _awayScore, _details);
        resolveSpreadMarket(_homeScore, _awayScore, _details);
        resolveOverUnderMarket(_homeScore, _awayScore, _details);
    }

    function resolveHeadToHeadMarket(
        int256 _homeScore,
        int256 _awayScore,
        MarketDetails memory _details
    ) internal {
        uint256 _id = _details.headToHead.marketId;

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
        int256 _homeScore,
        int256 _awayScore,
        MarketDetails memory _details
    ) internal {
        uint256 _id = _details.spread.marketId;
        int256 _targetSpread = _details.spread.homeSpread;
        int256 _actualSpread = _homeScore.sub(_awayScore);

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
        int256 _homeScore,
        int256 _awayScore,
        MarketDetails memory _details
    ) internal {
        uint256 _id = _details.overUnder.marketId;
        int256 _targetTotal = _details.overUnder.overUnderTotal;
        int256 _actualTotal = _homeScore.add(_awayScore);

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

    // Markets in this factory are bundled together by EventId.
    function getMarketDetails(uint256 _eventId) public view returns (MarketDetails memory) {
        return marketDetails[_eventId];
    }

    function onTransferOwnership(address, address) internal override {}
}
