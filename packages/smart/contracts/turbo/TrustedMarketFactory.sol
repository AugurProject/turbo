// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "../libraries/IERC20Full.sol";
import "../balancer/BPool.sol";
import "./AbstractMarketFactory.sol";
import "./FeePot.sol";

contract TrustedMarketFactory is AbstractMarketFactory {
    event MarketCreated(uint256 id, address creator, uint256 _endTime, string description, string[] outcomes);
    event MarketResolved(uint256 id, address winner);

    struct MarketDetails {
        string description;
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
        uint256 _protocolFee
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
    {}

    function createMarket(
        address _creator,
        uint256 _endTime,
        string calldata _description,
        string[] calldata _names,
        string[] calldata _symbols
    ) public onlyOwner returns (uint256) {
        uint256 _id = markets.length;
        markets.push(makeMarket(_creator, _names, _symbols, _endTime));
        marketDetails.push(MarketDetails(_description));

        emit MarketCreated(_id, _creator, _endTime, _description, _symbols);
        return _id;
    }

    function resolveMarket(uint256) public pure override {
        require(false, "Only the TrustedMarketFactory owner can resolve the market, using trustedResolveMarket");
    }

    function trustedResolveMarket(uint256 _id, uint256 _winningOutcome) public onlyOwner {
        OwnedERC20 _winner = markets[_id].shareTokens[_winningOutcome];
        markets[_id].winner = _winner;
        emit MarketResolved(_id, address(_winner));
    }

    function getMarketDetails(uint256 _id) public view returns (MarketDetails memory) {
        return marketDetails[_id];
    }
}
