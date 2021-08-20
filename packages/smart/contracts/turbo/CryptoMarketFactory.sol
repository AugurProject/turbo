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

contract CryptoMarketFactory is AbstractMarketFactoryV3, CalculateLinesToBPoolOdds, Versioned {
    using SafeMathUint256 for uint256;
    using SafeMathInt256 for int256;

    event CoinAdded(uint256 indexed id, string name);

    event NewPrices(uint256 indexed nextResolutionTime, uint256[] markets, uint256[] prices);

    struct Coin {
        string name;
        AggregatorV3Interface priceFeed;
        uint256 price;
        uint8 imprecision; // how many decimals to truncate
        uint256[1] currentMarkets;
    }
    Coin[] public coins;

    enum MarketType {
        PriceUpDown // 0
    }
    enum PriceUpDownOutcome {
        Above, // 0
        NotAbove // 1
    }
    struct MarketDetails {
        MarketType marketType;
        uint256 coinIndex;
        uint256 creationPrice;
        uint256 resolutionPrice;
    }
    // MarketId => MarketDetails
    mapping(uint256 => MarketDetails) internal marketDetails;

    address public linkNode; // market creator and resolver

    uint256 public nextResolutionTime;

    constructor(
        address _owner,
        IERC20Full _collateral,
        uint256 _shareFactor,
        FeePot _feePot,
        uint256[3] memory _fees,
        address _protocol,
        address _linkNode
    ) AbstractMarketFactoryV3(_owner, _collateral, _shareFactor, _feePot, _fees, _protocol) Versioned("v1.2.0") {
        linkNode = _linkNode;

        string memory _name = "";
        coins.push(makeCoin(_name, AggregatorV3Interface(0), 0));
    }

    function getMarketDetails(uint256 _marketId) public view returns (MarketDetails memory) {
        return marketDetails[_marketId];
    }

    // NOTE: Trusts the owner not to add a coin twice.
    // Returns the coin index.
    function addCoin(
        string calldata _name,
        AggregatorV3Interface _priceFeed,
        uint8 _imprecision
    ) external onlyOwner returns (uint256 _coinIndex) {
        Coin memory _coin = makeCoin(_name, _priceFeed, _imprecision);
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

    // Iterates over all coins.
    // If markets do not exist for coin, create them.
    // Unless _nextResolutionTime is zero; then do not create new markets.
    // If markets for coin exist and are ready to resolve, resolve them and create new markets.
    // Else, error.
    //
    // Assume that _roundIds has a dummy value at index 0, and is 1 indexed like the
    // coins array.
    function createAndResolveMarkets(uint80[] calldata _roundIds, uint256 _nextResolutionTime) public {
        require(msg.sender == linkNode, "Only link node can create markets");
        // If market creation was stopped then it can be started again.
        // If market creation wasn't stopped then you must wait for market end time to resolve.
        require(block.timestamp >= nextResolutionTime, "Must wait for market resolution");
        require(_roundIds.length == coins.length, "Must specify one roundId for each coin");

        uint256 _resolutionTime = nextResolutionTime;
        nextResolutionTime = _nextResolutionTime;

        uint256[] memory _prices = new uint256[](coins.length - 1);
        uint256[] memory _newMarketIds = new uint256[](coins.length - 1);
        // Start at 1 to skip the fake Coin in the 0 index
        for (uint256 i = 1; i < coins.length; i++) {
            (_prices[i - 1], _newMarketIds[i - 1]) = createAndResolveMarketsForCoin(i, _resolutionTime, _roundIds[i]);
        }

        emit NewPrices(nextResolutionTime, _newMarketIds, _prices);
    }

    function createAndResolveMarketsForCoin(
        uint256 _coinIndex,
        uint256 _resolutionTime,
        uint80 _roundId
    ) internal returns (uint256 _price, uint256 _newMarketId) {
        Coin memory _coin = coins[_coinIndex];
        (uint256 _fullPrice, uint256 _newPrice) = getPrice(_coin, _roundId, _resolutionTime);

        // resolve markets
        if (_coin.currentMarkets[uint256(MarketType.PriceUpDown)] != 0) {
            resolvePriceUpDownMarket(_coin, _newPrice, _fullPrice);
        }

        // update price only AFTER resolution
        coins[_coinIndex].price = _newPrice;

        // link node sets nextResolutionTime to zero to signify "do not create markets after resolution"
        if (nextResolutionTime == 0) {
            return (0, 0);
        }

        // create markets
        _newMarketId = createPriceUpDownMarket(_coinIndex, linkNode, _newPrice);
        coins[_coinIndex].currentMarkets[uint256(MarketType.PriceUpDown)] = _newMarketId;

        return (_newPrice, _newMarketId);
    }

    function resolvePriceUpDownMarket(
        Coin memory _coin,
        uint256 _newPrice,
        uint256 _fullPrice
    ) internal {
        uint256 _marketId = _coin.currentMarkets[uint256(MarketType.PriceUpDown)];

        uint256 _winningOutcome;
        if (_newPrice > _coin.price) {
            _winningOutcome = uint256(PriceUpDownOutcome.Above);
        } else {
            _winningOutcome = uint256(PriceUpDownOutcome.NotAbove);
        }

        endMarket(_marketId, _winningOutcome);
        marketDetails[_marketId].resolutionPrice = _fullPrice;
    }

    function createPriceUpDownMarket(
        uint256 _coinIndex,
        address _creator,
        uint256 _newPrice
    ) internal returns (uint256 _id) {
        string[] memory _outcomes = new string[](2);
        _outcomes[uint256(PriceUpDownOutcome.Above)] = "Above";
        _outcomes[uint256(PriceUpDownOutcome.NotAbove)] = "Not Above";

        _id = startMarket(_creator, _outcomes, evenOdds(false, 2), true);
        marketDetails[_id] = MarketDetails(MarketType.PriceUpDown, _coinIndex, _newPrice, 0);
    }

    // Returns the price based on a few factors.
    // If _roundId is zero then it returns the latest price.
    // Else, it returns the price for that round,
    //       but errors if that isn't the first round after the resolution time.
    // The price is then altered to match the desired precision.
    function getPrice(
        Coin memory _coin,
        uint80 _roundId,
        uint256 _resolutionTime
    ) internal view returns (uint256 _fullPrice, uint256 _truncatedPrice) {
        if (_roundId == 0) {
            (, int256 _rawPrice, , , ) = _coin.priceFeed.latestRoundData();
            require(_rawPrice >= 0, "Price from feed is negative");
            _fullPrice = uint256(_rawPrice);
        } else {
            (, int256 _rawPrice, , uint256 updatedAt, ) = _coin.priceFeed.getRoundData(_roundId);
            require(_rawPrice >= 0, "Price from feed is negative");
            require(updatedAt >= _resolutionTime, "Price hasn't been updated yet");

            // if resolution time is zero then market creation was stopped, so the previous round doesn't matter
            if (_resolutionTime != 0) {
                (, , , uint256 _previousRoundTime, ) = _coin.priceFeed.getRoundData(previousRound(_roundId));
                require(_previousRoundTime < _resolutionTime, "Must use first round after resolution time");
            }

            _fullPrice = uint256(_rawPrice);
        }

        // The precision is how many decimals the price has. Zero is dollars, 2 includes cents, 3 is tenths of a cent, etc.
        // Our resolution rules want a certain precision. Like BTC is to the dollar and MATIC is to the cent.
        // If somehow the decimals are larger than the desired precision then add zeroes to the end to meet the precision.
        // This does not change the resolution outcome but does guard against decimals() changing and therefore altering the basis.

        uint8 _precision = _coin.priceFeed.decimals(); // probably constant but that isn't guaranteed, so query each time
        if (_precision > _coin.imprecision) {
            uint8 _truncate = _precision - _coin.imprecision;
            _truncatedPrice = _fullPrice / (10**_truncate);
        } else if (_precision < _coin.imprecision) {
            uint8 _greaten = _coin.imprecision - _precision;
            _truncatedPrice = _fullPrice * (10**_greaten);
        } else {
            _truncatedPrice = _fullPrice;
        }

        // Round up because that cleanly fits Above/Not-Above.
        if (_truncatedPrice != _fullPrice) {
            _truncatedPrice += 1;
        }
    }

    function makeCoin(
        string memory _name,
        AggregatorV3Interface _priceFeed,
        uint8 _imprecision
    ) internal pure returns (Coin memory _coin) {
        uint256[1] memory _currentMarkets = [uint256(0)];
        _coin = Coin(_name, _priceFeed, 0, _imprecision, _currentMarkets);
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
}
