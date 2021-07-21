// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;
pragma abicoder v2;

import "../libraries/IERC20Full.sol";
import "../balancer/BPool.sol";
import "./AbstractMarketFactory.sol";
import "./FeePot.sol";
import "../libraries/SafeMathInt256.sol";

import "@chainlink/contracts/src/v0.7/interfaces/AggregatorV3Interface.sol";

contract CryptoMarketFactory is AbstractMarketFactory {
    using SafeMathUint256 for uint256;
    using SafeMathInt256 for int256;

    event MarketCreated(
        uint256 id,
        address creator,
        uint256 indexed endTime,
        MarketType marketType,
        uint256 indexed coinIndex,
        uint256 price
    );
    event MarketResolved(uint256 id, address winner);

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
        uint256 _stakerFee,
        uint256 _settlementFee,
        address _protocol,
        uint256 _protocolFee,
        address _linkNode,
        uint256 _firstResolutionTime
    )
        AbstractMarketFactory(
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
        nextResolutionTime = _firstResolutionTime;

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

        createAndResolveMarketsForCoin(_coinIndex, 0, 0);
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
    // If markets for coin are ready to resolve, resolve them and create new markets.
    // Else, error.
    //
    // Assume that _roundIds has a dummy value at index 0, and is 1 indexed like the
    // coins array.
    function createAndResolveMarkets(uint256 _roundIds[], uint256 _nextResolutionTime) public {
        require(msg.sender == linkNode, "Only link node can create markets");
        // If market creation was stopped then it can be started again.
        // If market creation wasn't stopped then you must wait for market end time to resolve.
        require(nextResolutionTime == 0 || block.timestamp >= nextResolutionTime, "Must wait for market resolution");

        uint256 resolutionTime = nextResolutionTime;
        nextResolutionTime = _nextResolutionTime;

        // Start at 1 to skip the fake Coin in the 0 index
        for (uint256 i = 1; i < coins.length; i++) {
            createAndResolveMarketsForCoin(i, resolutionTime, roundIds[i]);
        }
    }

    function createAndResolveMarketsForCoin(uint256 _coinIndex, uint256 resolutionTime, uint256 _roundId) internal {
        Coin memory _coin = coins[_coinIndex];
        (uint256 _fullPrice, uint256 _newPrice) = getPrice(_coin, _roundId);

        // resolve markets
        if (_coin.currentMarkets[uint256(MarketType.PriceUpDown)] != 0) {
            resolvePriceUpDownMarket(_coin, _newPrice, _fullPrice);
        }

        // update price only AFTER resolution
        coins[_coinIndex].price = _newPrice;

        // link node sets nextResolutionTime to zero to signify "do not create markets after resolution"
        if (nextResolutionTime == 0) {
            return;
        }

        // create markets
        coins[_coinIndex].currentMarkets[uint256(MarketType.PriceUpDown)] = createPriceUpDownMarket(
            _coinIndex,
            linkNode,
            _newPrice
        );
    }

    function resolvePriceUpDownMarket(
        Coin memory _coin,
        uint256 _newPrice,
        uint256 _fullPrice
    ) internal {
        uint256 _marketId = _coin.currentMarkets[uint256(MarketType.PriceUpDown)];

        OwnedERC20 _winner;
        if (_newPrice > _coin.price) {
            _winner = markets[_marketId].shareTokens[uint256(PriceUpDownOutcome.Above)];
        } else {
            _winner = markets[_marketId].shareTokens[uint256(PriceUpDownOutcome.NotAbove)];
        }

        markets[_marketId].winner = _winner;
        marketDetails[_marketId].resolutionPrice = _fullPrice;
        emit MarketResolved(_marketId, address(_winner));
    }

    function createPriceUpDownMarket(
        uint256 _coinIndex,
        address _creator,
        uint256 _newPrice
    ) internal returns (uint256 _id) {
        string[] memory _outcomes = new string[](2);
        _outcomes[uint256(PriceUpDownOutcome.Above)] = "Above";
        _outcomes[uint256(PriceUpDownOutcome.NotAbove)] = "Not Above";

        uint256 _nextResolutionTime = nextResolutionTime;
        _id = markets.length;
        markets.push(makeMarket(_creator, _outcomes, _outcomes, _nextResolutionTime));
        marketDetails[_id] = MarketDetails(MarketType.PriceUpDown, _coinIndex, _newPrice, 0);
        emit MarketCreated(_id, _creator, _nextResolutionTime, MarketType.PriceUpDown, _coinIndex, _newPrice);
    }

    function getPrice(Coin memory _coin, uint256 _roundId) internal view returns (uint256 _fullPrice, uint256 _truncatedPrice) {
        if (_roundId == 0) {
          (, int256 _rawPrice, , , ) = _coin.priceFeed.getLatestRoundData();
          require(_rawPrice >= 0, "Price from feed is negative");
          _fullPrice = uint256(_rawPrice);
        } else {
          (, int256 _rawPrice, , , ) = _coin.priceFeed.getRoundData(_roundId);
          require(_rawPrice >= 0, "Price from feed is negative");
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

    function resolveMarket(uint256) public pure override {
        require(false, "Use createAndResolveMarkets");
    }
}
