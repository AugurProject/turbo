pragma solidity 0.5.15;
pragma experimental ABIEncoderV2;

import "../libraries/IERC20.sol";
import "../augur-core/reporting/IMarket.sol";
import "../libraries/Initializable.sol";
import "./IArbiter.sol";
import "../libraries/SafeMathUint256.sol";
import "./ISymbioteHatchery.sol";
import "../libraries/Ownable.sol";

contract TrustedArbiter is IArbiter, Ownable {
    using SafeMathUint256 for uint256;

    struct TrustedConfiguration {
        uint256 startTime;
        uint256 duration;
        string extraInfo;
        int256[] prices;
        IMarket.MarketType marketType;
    }

    struct SymbioteData {
        uint256 startTime;
        uint256 endTime;
        string extraInfo;
        uint256 numTicks;
        bytes32[] outcomeNames;
        string[] outcomeSymbols;
        int256[] prices;
        IMarket.MarketType marketType;
        bytes32 winningPayoutHash;
        uint256 totalStake;
        IMarket fallbackMarket;
    }

    address public hatchery;
    mapping(uint256 => SymbioteData) public symbioteData;

    constructor(address _owner, ISymbioteHatchery _hatchery) public {
        owner = _owner;
        hatchery = address(_hatchery);
    }

    function onSymbioteCreated(uint256 _id, string[] memory _outcomeSymbols, bytes32[] memory _outcomeNames, uint256 _numTicks, bytes memory _arbiterConfiguration) public {
        require(msg.sender == hatchery, "Can only call `onSymbioteCreated` from the hatchery");

        (TrustedConfiguration memory _config) = abi.decode(_arbiterConfiguration, (TrustedConfiguration));
        require(_config.startTime > block.timestamp, "Cannot create a market that is already over");
        require(_config.prices.length == 2 || _config.prices.length == 0, "Scalar markets have 2 prices. all others have 0");
        if (_config.prices.length == 2) {
            require(_config.prices[0] < _config.prices[1], "First price is the minimum");
            require(uint256(_config.prices[1] - _config.prices[0]) > _numTicks, "Price range must be larger than numticks");
        }
        require(_config.marketType != IMarket.MarketType.YES_NO, "YES/NO not permitted"); // just use categorical

        symbioteData[_id].startTime = _config.startTime;
        symbioteData[_id].endTime = _config.startTime + _config.duration;
        symbioteData[_id].extraInfo = _config.extraInfo;
        symbioteData[_id].numTicks = _numTicks;
        symbioteData[_id].prices = _config.prices;
        symbioteData[_id].outcomeNames = _outcomeNames;
        symbioteData[_id].outcomeSymbols = _outcomeSymbols;
        symbioteData[_id].marketType = _config.marketType;
    }

    function encodeConfiguration(
        uint256 _startTime,
        uint256 _duration,
        string memory _extraInfo,
        int256[] memory _prices,
        IMarket.MarketType _marketType
    ) public pure returns (bytes memory) {
        return abi.encode(TrustedConfiguration(_startTime, _duration, _extraInfo, _prices, _marketType));
    }

    function decodeConfiguration(bytes memory _arbiterConfiguration) public pure returns (TrustedConfiguration memory) {
        (TrustedConfiguration memory _config) = abi.decode(_arbiterConfiguration, (TrustedConfiguration));
        return _config;
    }

    // symbiote id => payout
    mapping(uint256 => uint256[]) private symbioteResolutions;

    function getSymbioteResolution(uint256 _id) public returns (uint256[] memory) {
        return symbioteResolutions[_id];
    }

    function setSymbioteResolution(uint256 _id, uint256[] calldata _payout) external onlyOwner {
        symbioteResolutions[_id] = _payout;
    }

    function validatePayout(uint256 _id, uint256[] memory _payout) public view returns (bool) {
        uint256 _numOutcomes = symbioteData[_id].outcomeNames.length + 1;
        uint256 _numTicks = symbioteData[_id].numTicks;
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

    function onTransferOwnership(address, address) internal {}
}