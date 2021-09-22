// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;
pragma abicoder v2;

import "../libraries/IERC20Full.sol";
import "../balancer/BPool.sol";
import "./AbstractMarketFactoryV3.sol";
import "./FeePot.sol";
import "../libraries/SafeMathInt256.sol";
import "@chainlink/contracts/src/v0.7/interfaces/AggregatorV3Interface.sol";
import "../libraries/CalculateLinesToBPoolOdds.sol";
import "../libraries/Versioned.sol";
import "../libraries/ManagedByLink.sol";

contract CryptoCurrencyMarketFactoryV3 is AbstractMarketFactoryV3, CalculateLinesToBPoolOdds, Versioned, ManagedByLink {
    using SafeMathUint256 for uint256;
    using SafeMathInt256 for int256;

    event CoinAdded(uint256 indexed id, string name);
    event ValueUpdate(uint256 indexed coinIndex, uint256 indexed resolutionTime, uint256 market, uint256 value);

    enum Outcome {
        Above, // 0
        NotAbove // 1
    }
    string constant Above = "Above";
    string constant NotAbove = "Not Above";

    struct Coin {
        string name;
        AggregatorV3Interface feed;
        uint256 value;
        uint8 imprecision; // how many decimals to truncate
        uint256 currentMarket; // 0 indicates no current market
    }
    Coin[] public coins;

    struct MarketDetails {
        uint256 coinIndex;
        uint256 creationValue;
        uint256 resolutionValue;
        uint256 resolutionTime; // value at given time; this is that time
    }
    // MarketId => MarketDetails
    mapping(uint256 => MarketDetails) internal marketDetails;

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
        Versioned("v1.3.3")
        ManagedByLink(_linkNode)
    {
        string memory _name = "";
        coins.push(makeCoin(_name, AggregatorV3Interface(0), 0));
    }

    function getMarketDetails(uint256 _marketId) public view returns (MarketDetails memory) {
        return marketDetails[_marketId];
    }

    // NOTE: Trusts the owner not to add a coin twice.
    function addCoin(
        string calldata _name,
        AggregatorV3Interface _feed,
        uint8 _imprecision
    ) external onlyOwner returns (uint256 _coinIndex) {
        Coin memory _coin = makeCoin(_name, _feed, _imprecision);
        _coinIndex = coins.length;
        coins.push(_coin);
        emit CoinAdded(_coinIndex, _name);
    }

    function getCoin(uint256 _coinIndex) public view returns (Coin memory _coin) {
        _coin = coins[_coinIndex];
    }

    function getCoins() public view returns (Coin[] memory _coins) {
        _coins = new Coin[](coins.length);
        // Skip first coin because it's always the zeroed-out fake coin.
        for (uint256 i = 1; i < coins.length; i++) {
            _coins[i] = coins[i];
        }
    }

    // If _resolutionTime is 0 then do NOT create.
    // If _roundId is 0 then do NOT resolve.
    function pokeCoin(
        uint256 _coinIndex,
        uint256 _resolutionTime,
        uint80 _roundId
    ) public onlyLinkNode {
        Coin storage _coin = coins[_coinIndex];

        // There's a market to resolve.
        if (_roundId != 0 && _coin.currentMarket != 0) {
            resolveMarket(_coin, _roundId);
        }

        // Create a market
        if (_resolutionTime != 0 && _coin.currentMarket == 0) {
            createMarket(_coinIndex, _coin, _resolutionTime);
        }
    }

    function createMarket(
        uint256 _coinIndex,
        Coin storage _coin,
        uint256 _resolutionTime
    ) internal returns (uint256 _marketId) {
        (, uint256 _newValue) = getLatestValue(_coin);

        string[] memory _outcomes = new string[](2);
        _outcomes[uint256(Outcome.Above)] = Above;
        _outcomes[uint256(Outcome.NotAbove)] = NotAbove;

        _marketId = startMarket(linkNode, _outcomes, evenOdds(false, 2), true);
        marketDetails[_marketId] = MarketDetails(_coinIndex, _newValue, 0, _resolutionTime);
        _coin.currentMarket = _marketId;
        _coin.value = _newValue;
        emit ValueUpdate(_coinIndex, _resolutionTime, _marketId, _newValue);
    }

    function resolveMarket(Coin storage _coin, uint80 _roundId) internal {
        uint256 _resolutionTime = marketDetails[_coin.currentMarket].resolutionTime;
        (uint256 _fullValue, uint256 _newValue) = getSpecificValue(_coin, _roundId, _resolutionTime);

        uint256 _winningOutcome;
        if (_newValue > _coin.value) {
            _winningOutcome = uint256(Outcome.Above);
        } else {
            _winningOutcome = uint256(Outcome.NotAbove);
        }

        endMarket(_coin.currentMarket, _winningOutcome);
        marketDetails[_coin.currentMarket].resolutionValue = _fullValue;
        _coin.currentMarket = 0;
        _coin.value = 0;
    }

    function getLatestValue(Coin storage _coin) internal view returns (uint256 _fullValue, uint256 _truncatedValue) {
        (, int256 _rawValue, , , ) = _coin.feed.latestRoundData();
        require(_rawValue >= 0, "Value from feed is negative");
        _fullValue = uint256(_rawValue);
        _truncatedValue = calcTruncatedValue(_coin, _fullValue);
    }

    // Get value at a specific round, but fail if it isn't after a specific time.
    function getSpecificValue(
        Coin storage _coin,
        uint80 _roundId,
        uint256 _resolutionTime
    ) internal view returns (uint256 _fullValue, uint256 _truncatedValue) {
        (, int256 _rawValue, , uint256 _updatedAt, ) = _coin.feed.getRoundData(_roundId);
        require(_rawValue >= 0, "Value from feed is negative");
        require(_updatedAt >= _resolutionTime, "Value hasn't been updated yet");

        (, , , uint256 _previousRoundTime, ) = _coin.feed.getRoundData(previousRound(_roundId));
        require(_previousRoundTime < _resolutionTime, "Must use first round after resolution time");

        _fullValue = uint256(_rawValue);
        _truncatedValue = calcTruncatedValue(_coin, _fullValue);
    }

    // The precision is how many decimals the value has. Zero is dollars, 2 includes cents, 3 is tenths of a cent, etc.
    // Our resolution rules want a certain precision. Like BTC is to the dollar and MATIC is to the cent.
    // If somehow the decimals are larger than the desired precision then add zeroes to the end to meet the precision.
    // This does not change the resolution outcome but does guard against decimals() changing and therefore altering the basis.
    function calcTruncatedValue(Coin storage _coin, uint256 _fullValue)
        internal
        view
        returns (uint256 _truncatedValue)
    {
        uint8 _precision = _coin.feed.decimals(); // probably constant but that isn't guaranteed, so query each time
        if (_precision > _coin.imprecision) {
            uint8 _truncate = _precision - _coin.imprecision;
            _truncatedValue = _fullValue / (10**_truncate);
        } else if (_precision < _coin.imprecision) {
            uint8 _greaten = _coin.imprecision - _precision;
            _truncatedValue = _fullValue * (10**_greaten);
        } else {
            _truncatedValue = _fullValue;
        }

        // Round up because that cleanly fits Above/Not-Above.
        if (_truncatedValue != _fullValue) {
            _truncatedValue += 1;
        }
    }

    function makeCoin(
        string memory _name,
        AggregatorV3Interface _feed,
        uint8 _imprecision
    ) internal pure returns (Coin memory _coin) {
        _coin = Coin(_name, _feed, 0, _imprecision, 0);
    }

    // The roundId is the encoding of two parts: the phase and the phase-specific round id.
    // To find the previous roundId:
    // 1. extract the phase and phase-specific round (I call these _phaseId and _roundId)
    // 2. decrement the phase-specific round
    // 3. re-encode the phase and phase-specific round.
    uint256 private constant PHASE_OFFSET = 64;

    function previousRound(uint80 _fullRoundId) internal pure returns (uint80) {
        uint256 _phaseId = uint256(uint16(_fullRoundId >> PHASE_OFFSET));
        uint64 _roundId = uint64(_fullRoundId) - 1;
        return uint80((_phaseId << PHASE_OFFSET) | _roundId);
    }

    function getRewardEndTime(uint256 _marketId) public view override returns (uint256) {
        return getMarketDetails(_marketId).resolutionTime;
    }
}
