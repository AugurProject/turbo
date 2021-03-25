pragma solidity 0.7.6;
pragma experimental ABIEncoderV2;

import "./ITurboShareToken.sol";
import "../libraries/Initializable.sol";
import "../libraries/SafeMathUint256.sol";
import "../libraries/IERC20.sol";
import "../augur-para/IFeePot.sol";
import "./ITurboShareTokenFactory.sol";
import "./IArbiter.sol";

contract HasTurboStruct {
    struct Turbo {
        address creator;
        uint256 creatorFee;
        uint256 numTicks;
        IArbiter arbiter;
        ITurboShareToken[] shareTokens;
        uint256 creatorFees;
    }
}

contract ITurboHatchery is HasTurboStruct {
    Turbo[] public turbos;
    ITurboShareTokenFactory public tokenFactory;
    IFeePot public feePot;
    IERC20 public collateral;

    event TurboCreated(uint256 id, uint256 creatorFee, string[] outcomeSymbols, bytes32[] outcomeNames, uint256 numTicks, IArbiter arbiter, bytes arbiterConfiguration, uint256 indexed index);
    event CompleteSetsMinted(uint256 turboId, uint256 amount, address target);
    event CompleteSetsBurned(uint256 turboId, uint256 amount, address target);
    event Claim(uint256 turboId);

    function createTurbo(uint256 _index, uint256 _creatorFee, string[] memory _outcomeSymbols, bytes32[] memory _outcomeNames, uint256 _numTicks, IArbiter _arbiter, bytes memory _arbiterConfiguration) public returns (uint256);
    function getShareTokens(uint256 _id) external view returns (ITurboShareToken[] memory);
    function mintCompleteSets(uint256 _id, uint256 _amount, address _receiver) public returns (bool);
    function burnCompleteSets(uint256 _id, uint256 _amount, address _receiver) public returns (bool);
    function claimWinnings(uint256 _id) public returns (bool);
    function withdrawCreatorFees(uint256 _id) external returns (bool);
}
