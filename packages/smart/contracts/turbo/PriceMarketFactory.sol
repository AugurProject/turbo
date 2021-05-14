// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;
pragma abicoder v2;

import "../balancer/BPool.sol";
import "./AbstractMarketFactory.sol";
import "./FeePot.sol";
import "../libraries/IERC20Full.sol";

// IMPORTANT: This can *ONLY* be used for testing.
//            The spot price is extremely manipulable.
contract TestPriceMarketFactory is AbstractMarketFactory {
    using SafeMathUint256 for uint256;

    event MarketCreated(uint256 id, address creator, uint256 endTime, uint256 spotPrice);
    event MarketResolved(uint256 id, address winner);

    BPool pool;
    IERC20Full tokenIn;
    IERC20Full tokenOut;

    struct MarketDetails {
        uint256 spotPrice;
        uint256 resolvedSpotPrice;
    }
    MarketDetails[] internal marketDetails;

    constructor(
        address _owner,
        IERC20Full _collateral,
        uint256 _shareFactor,
        FeePot _feePot,
        uint256 _stakerFee,
        uint256 _settlementFee,
        address _protocol,
        uint256 _protocolFee,
        BPool _pool,
        IERC20Full _tokenIn,
        IERC20Full _tokenOut
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
        pool = _pool;
        tokenIn = _tokenIn;
        tokenOut = _tokenOut;
    }

    function createMarket(
        address _creator,
        uint256 _endTime,
        uint256 _spotPrice
    ) public returns (uint256) {
        require(_endTime > block.timestamp, "Market must end in the future");

        string[] memory _names = new string[](2);
        _names[0] = string("Low");
        _names[1] = string("High");
        string[] memory _symbols = new string[](2);
        _symbols[0] = string("LOW");
        _symbols[1] = string("HIGH");

        uint256 _id = markets.length;
        markets.push(makeMarket(_creator, _names, _symbols, _endTime));
        marketDetails.push(MarketDetails(_spotPrice, 0));

        emit MarketCreated(_id, _creator, _endTime, _spotPrice);
        return _id;
    }

    function resolveMarket(uint256 _id) public override {
        Market storage _market = markets[_id];
        MarketDetails storage _marketDetails = marketDetails[_id];
        require(_market.endTime > 0, "No such market");
        require(_market.endTime > block.timestamp, "Market cannot be resolved until its endTime");

        uint256 _resolvedSpotPrice = pool.getSpotPriceSansFee(address(tokenIn), address(tokenOut));
        _marketDetails.resolvedSpotPrice = _resolvedSpotPrice;

        if (_resolvedSpotPrice < _marketDetails.spotPrice) {
            _market.winner = _market.shareTokens[0]; // LOW
        } else {
            _market.winner = _market.shareTokens[1]; // HIGH
        }

        emit MarketResolved(_id, address(_market.winner));
    }

    function getMarketDetails(uint256 _id) public view returns (MarketDetails memory) {
        return marketDetails[_id];
    }
}
