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
        uint256 price;
    }
    // MarketId => MarketDetails
    mapping(uint256 => MarketDetails) internal marketDetails;

    address public linkNode; // market creator and resolver

    uint256 public cadence; // how often markets are created and resolved
    uint256 firstResolutionTime;
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
        uint256 _firstResolutionTime,
        uint256 _cadence
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

        firstResolutionTime = _firstResolutionTime;
        cadence = _cadence;
        nextResolutionTime = _firstResolutionTime;

        string memory _name = "";
        coins.push(makeCoin(_name, AggregatorV3Interface(0)));
    }

    function getMarketDetails(uint256 _marketId) public view returns (MarketDetails memory) {
        return marketDetails[_marketId];
    }

    // NOTE: Trusts the owner not to add a coin twice.
    // Returns the coin index.
    function addCoin(string calldata _name, AggregatorV3Interface _priceFeed)
        external
        onlyOwner
        returns (uint256 _coinIndex)
    {
        Coin memory _coin = makeCoin(_name, _priceFeed);
        coins.push(_coin);
        _coinIndex = coins.length - 1;

        createAndResolveMarketsForCoin(_coinIndex);
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
    function createAndResolveMarkets() public {
        require(msg.sender == linkNode, "Only link node can create markets");
        require(block.timestamp >= nextResolutionTime, "Must wait for market resolutionTime");

        updateNextResolutionTime();

        // Start at 1 to skip the fake Coin in the 0 index
        for (uint256 i = 1; i < coins.length; i++) {
            createAndResolveMarketsForCoin(i);
        }
    }

    function createAndResolveMarketsForCoin(uint256 _coinIndex) internal {
        Coin memory _coin = coins[_coinIndex];
        uint256 _newPrice = getPrice(_coin.priceFeed);

        if (_coin.currentMarkets[uint256(MarketType.PriceUpDown)] != 0) {
            resolvePriceUpDownMarket(_coin, _newPrice);
        }

        coins[_coinIndex].price = _newPrice;
        coins[_coinIndex].currentMarkets[uint256(MarketType.PriceUpDown)] = createPriceUpDownMarket(
            _coinIndex,
            linkNode,
            _newPrice
        );
    }

    function resolvePriceUpDownMarket(Coin memory _coin, uint256 _newPrice) internal {
        uint256 _marketId = _coin.currentMarkets[uint256(MarketType.PriceUpDown)];

        OwnedERC20 _winner;
        if (_newPrice > _coin.price) {
            _winner = markets[_marketId].shareTokens[uint256(PriceUpDownOutcome.Above)];
        } else {
            _winner = markets[_marketId].shareTokens[uint256(PriceUpDownOutcome.NotAbove)];
        }

        markets[_marketId].winner = _winner;
        emit MarketResolved(_marketId, address(_winner));
    }

    function createPriceUpDownMarket(
        uint256 _coinIndex,
        address _creator,
        uint256 _newPrice
    ) internal returns (uint256 _id) {
        string[] memory _outcomes = new string[](3);
        _outcomes[uint256(PriceUpDownOutcome.Above)] = "Above";
        _outcomes[uint256(PriceUpDownOutcome.NotAbove)] = "Not Above";

        _id = markets.length;
        uint256 _nextResolutionTime = nextResolutionTime;
        markets.push(makeMarket(_creator, _outcomes, _outcomes, _nextResolutionTime));
        marketDetails[_id] = MarketDetails(MarketType.PriceUpDown, _coinIndex, _newPrice);
        emit MarketCreated(_id, _creator, _nextResolutionTime, MarketType.PriceUpDown, _coinIndex, _newPrice);
    }

    function getPrice(AggregatorV3Interface _priceFeed) internal view returns (uint256) {
        (, int256 _price,,,) =
            _priceFeed.latestRoundData();
        require(_price >= 0, "Price from feed is negative");
        return uint256(_price);
    }

    function updateNextResolutionTime() internal returns (uint256 _nextResolutionTime) {
        _nextResolutionTime = nextResolutionTime;
        uint256 _blockTime = block.timestamp;

        if (_nextResolutionTime > _blockTime) {
            // No need to update resolution time.
            return _nextResolutionTime;
        } else {
            // Bump time to make the while loop's first iteration useful.
            _nextResolutionTime += cadence;
        }

        // Iterate in case the resolution time is more than one cadence behind.
        while (true) {
            if (_nextResolutionTime > _blockTime) {
                nextResolutionTime = _nextResolutionTime;
                return _nextResolutionTime;
            } else {
                _nextResolutionTime += cadence;
            }
        }
    }

    function makeCoin(string memory _name, AggregatorV3Interface _priceFeed) internal pure returns (Coin memory _coin) {
        uint256[1] memory _currentMarkets = [uint256(0)];
        _coin = Coin(_name, _priceFeed, 0, _currentMarkets);
    }

    function resolveMarket(uint256) public pure override {
        require(false, "Use createAndResolveMarkets");
    }
}
