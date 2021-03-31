// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

import "./ITurboHatchery.sol";
import "./IArbiter.sol";
import "../balancer/BPool.sol";
pragma experimental ABIEncoderV2;


interface IMarketTemplate {
    function createMarket() external returns (uint256);
}

// Will the price of ETH be above x USDC on date y?
contract PriceTemplate {
    uint256 constant CREATOR_FEE = 10**16; // 1%
    uint256 constant NUMTICKS = 1000;

    ITurboHatchery hatchery;
    PriceArbiter arbiter;

    constructor(ITurboHatchery _hatchery, address _tokenIn, address _tokenOut, BPool _bPool) {
        hatchery = _hatchery;
        IPriceOracle _priceOracle = new BPoolPriceOracle(_bPool);
        arbiter = new PriceArbiter(_hatchery, _priceOracle, _tokenIn, _tokenOut);
    }

    function createMarket(uint256 _endTime, uint256 _spotPriceToHit) external returns (uint256) {
        uint256 _index = uint256(msg.sender);

        string[] memory _outcomeSymbols = new string[](2);
        _outcomeSymbols[0] = "NO";
        _outcomeSymbols[1] = "YES";
        bytes32[] memory _outcomeNames = new bytes32[](2);
        _outcomeNames[0] = "No";
        _outcomeNames[1] = "Yes";

        bytes memory _arbiterConfiguration = arbiter.encodeConfiguration(_endTime, _spotPriceToHit);
        return hatchery.createTurbo(_index, CREATOR_FEE, _outcomeSymbols, _outcomeNames, NUMTICKS, arbiter, _arbiterConfiguration);
    }
}

contract PriceArbiter is IArbiter {
    struct PriceArbiterConfiguration {
        uint256 endTime;
        uint256 spotPriceToHit;
    }

    struct TurboData {
        bool resolved;
        uint256 endTime;
        uint256 spotPriceToHit;
        uint256[] resolution;
    }

    uint256 constant NUMTICKS = 1000;

    ITurboHatchery public hatchery;
    IPriceOracle public priceOracle;
    address public tokenIn;
    address public tokenOut;
    mapping(uint256 => TurboData) public turboData;

    constructor(ITurboHatchery _hatchery, IPriceOracle _priceOracle, address _tokenIn, address _tokenOut) {
        hatchery = _hatchery;
        priceOracle = _priceOracle;
        tokenIn = _tokenIn;
        tokenOut = _tokenOut;
    }

    function onTurboCreated(
        uint256 _id,
        string[] memory,
        bytes32[] memory,
        uint256,
        bytes memory _arbiterConfiguration
    ) external override {
        require(msg.sender == address(hatchery), "Can only call `onTurboCreated` from the hatchery");

        (PriceArbiterConfiguration memory _config) = decodeConfiguration(_arbiterConfiguration);
        require(_config.endTime > block.timestamp, "Market endtime must be in the future");

        turboData[_id].resolved = false; // unnecessary but kept for clarity
        turboData[_id].endTime = _config.endTime;
        turboData[_id].spotPriceToHit = _config.spotPriceToHit;
    }

    function encodeConfiguration(uint256 _endTime, uint256 _spotPriceToHit) public pure returns (bytes memory) {
        return abi.encode(PriceArbiterConfiguration(_endTime, _spotPriceToHit));
    }

    function decodeConfiguration(bytes memory _arbiterConfiguration) public pure returns (PriceArbiterConfiguration memory) {
        (PriceArbiterConfiguration memory _config) = abi.decode(_arbiterConfiguration, (PriceArbiterConfiguration));
        return _config;
    }

    function getTurboResolution(uint256 _id) external override returns (uint256[] memory) {
        TurboData storage _turbo = turboData[_id];
        if (_turbo.resolved) {
            return _turbo.resolution; // already resolved
        } else if (block.timestamp < _turbo.endTime) {
            return new uint256[](0);
        } else {
            // resolve
            uint256 _spotPrice = priceOracle.getSpotPrice(tokenIn, tokenOut);
            if (_spotPrice >= _turbo.spotPriceToHit) {
                _turbo.resolution = [0, NUMTICKS, 0]; // NO wins
            } else {
                _turbo.resolution = [0, 0, NUMTICKS]; // YES wins
            }
            return _turbo.resolution;
        }
    }
}

interface IPriceOracle {
    function getSpotPrice(address _tokenIn, address _tokenOut) external returns (uint256);
}

contract BPoolPriceOracle is IPriceOracle {
    BPool bPool;

    constructor(BPool _bPool) {
        bPool = _bPool;
    }

    function getSpotPrice(address _tokenIn, address _tokenOut) external view override returns (uint256) {
        return bPool.getSpotPrice(_tokenIn, _tokenOut);
    }
}