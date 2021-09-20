// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;
pragma abicoder v2;

import "./AbstractMarketFactoryV3.sol";
import "../libraries/CalculateLinesToBPoolOdds.sol";
import "../libraries/Versioned.sol";

contract TrustedMarketFactoryV3 is AbstractMarketFactoryV3, CalculateLinesToBPoolOdds, Versioned {
    using SafeMathUint256 for uint256;

    struct MarketDetails {
        string description;
    }
    MarketDetails[] internal marketDetails;

    constructor(
        address _owner,
        IERC20Full _collateral,
        uint256 _shareFactor,
        FeePot _feePot,
        uint256[3] memory _fees,
        address _protocol
    ) AbstractMarketFactoryV3(_owner, _collateral, _shareFactor, _feePot, _fees, _protocol) Versioned("v1.1.0") {}

    function createMarket(
        address _creator,
        string calldata _description,
        string[] calldata _names,
        uint256[] calldata _odds
    ) public onlyOwner returns (uint256) {
        marketDetails.push(MarketDetails(_description));
        return startMarket(_creator, _names, _odds, true);
    }

    function trustedResolveMarket(uint256 _id, uint256 _winningOutcome) public onlyOwner {
        endMarket(_id, _winningOutcome);
    }

    function getMarketDetails(uint256 _id) public view returns (MarketDetails memory) {
        return marketDetails[_id];
    }

    function getRewardEndTime(uint256 _marketId) public view override returns (uint256) {
        return 0;
    }
}
