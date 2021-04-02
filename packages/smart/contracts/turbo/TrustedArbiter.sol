// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;
pragma experimental ABIEncoderV2;

import "../libraries/IERC20.sol";
import "../libraries/Initializable.sol";
import "./IArbiter.sol";
import "../libraries/SafeMathUint256.sol";
import "./ITurboHatchery.sol";
import "../libraries/Ownable.sol";

contract TrustedArbiter is IArbiter, Ownable {
    using SafeMathUint256 for uint256;

    enum MarketType {YES_NO, CATEGORICAL, SCALAR}

    struct TrustedConfiguration {
        uint256 startTime;
        uint256 duration;
        string extraInfo;
        int256[] prices;
        MarketType marketType;
    }

    struct TurboData {
        uint256 startTime;
        uint256 endTime;
        string extraInfo;
        uint256 numTicks;
        bytes32[] outcomeNames;
        string[] outcomeSymbols;
        int256[] prices;
        MarketType marketType;
        bytes32 winningPayoutHash;
        uint256 totalStake;
    }

    address public hatchery;
    mapping(uint256 => TurboData) public turboData;

    constructor(address _owner, ITurboHatchery _hatchery) {
        owner = _owner;
        hatchery = address(_hatchery);
    }

    function onTurboCreated(
        uint256 _id,
        string[] memory _outcomeSymbols,
        bytes32[] memory _outcomeNames,
        uint256 _numTicks,
        bytes memory _arbiterConfiguration
    ) public override {
        require(msg.sender == hatchery, "Can only call `onTurboCreated` from the hatchery");

        TrustedConfiguration memory _config = abi.decode(_arbiterConfiguration, (TrustedConfiguration));
        require(_config.startTime > block.timestamp, "Cannot create a market that is already over");
        require(
            _config.prices.length == 2 || _config.prices.length == 0,
            "Scalar markets have 2 prices. All others have 0"
        );
        if (_config.prices.length == 2) {
            require(_config.prices[0] < _config.prices[1], "First price is the minimum");
            require(
                uint256(_config.prices[1] - _config.prices[0]) > _numTicks,
                "Price range must be larger than numticks"
            );
        }
        require(_config.marketType != MarketType.YES_NO, "YES/NO not permitted"); // just use categorical

        turboData[_id].startTime = _config.startTime;
        turboData[_id].endTime = _config.startTime + _config.duration;
        turboData[_id].extraInfo = _config.extraInfo;
        turboData[_id].numTicks = _numTicks;
        turboData[_id].prices = _config.prices;
        turboData[_id].outcomeNames = _outcomeNames;
        turboData[_id].outcomeSymbols = _outcomeSymbols;
        turboData[_id].marketType = _config.marketType;
    }

    function encodeConfiguration(
        uint256 _startTime,
        uint256 _duration,
        string memory _extraInfo,
        int256[] memory _prices,
        MarketType _marketType
    ) public pure returns (bytes memory) {
        return abi.encode(TrustedConfiguration(_startTime, _duration, _extraInfo, _prices, _marketType));
    }

    function decodeConfiguration(bytes memory _arbiterConfiguration) public pure returns (TrustedConfiguration memory) {
        TrustedConfiguration memory _config = abi.decode(_arbiterConfiguration, (TrustedConfiguration));
        return _config;
    }

    function getTurbo(uint256 _id) external view returns (TurboData memory _data) {
        _data = turboData[_id];
    }

    // turbo id => payout
    mapping(uint256 => uint256[]) private turboResolutions;

    function getTurboResolution(uint256 _id) public view override returns (uint256[] memory) {
        return turboResolutions[_id];
    }

    function setTurboResolution(uint256 _id, uint256[] calldata _payout) external onlyOwner {
        turboResolutions[_id] = _payout;
    }

    function validatePayout(uint256 _id, uint256[] memory _payout) public view returns (bool) {
        uint256 _numOutcomes = turboData[_id].outcomeNames.length + 1;
        uint256 _numTicks = turboData[_id].numTicks;
        require(_payout[0] == 0 || _payout[0] == _numTicks, "Invalid payout must be all or none");
        require(_payout.length == _numOutcomes, "Malformed payout length");
        uint256 _sum = 0;
        for (uint256 i = 0; i < _payout.length; i++) {
            uint256 _value = _payout[i];
            _sum = _sum.add(_value);
        }
        require(_sum == _numTicks, "Malformed payout sum");
        return true;
    }

    function getPayoutHash(uint256[] memory _payout) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(_payout));
    }

    function onTransferOwnership(address, address) internal override {}
}
