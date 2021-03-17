pragma solidity 0.5.15;
pragma experimental ABIEncoderV2;

import "./ISymbioteShareToken.sol";
import "../libraries/Initializable.sol";
import "../libraries/SafeMathUint256.sol";
import "../libraries/IERC20.sol";
import "../augur-para/IFeePot.sol";
import "../augur-para/IParaOICash.sol";
import "./ISymbioteShareTokenFactory.sol";
import "./IArbiter.sol";

contract ISymbioteHatchery {
    struct Symbiote {
        address creator;
        uint256 creatorFee;
        uint256 numTicks;
        IArbiter arbiter;
        ISymbioteShareToken[] shareTokens;
        uint256 creatorFees;
    }

    Symbiote[] public symbiotes;
    ISymbioteShareTokenFactory public tokenFactory;
    IFeePot public feePot;
    IERC20 public collateral;

    event SymbioteCreated(uint256 creatorFee, string[] outcomeSymbols, bytes32[] outcomeNames, uint256 numTicks, IArbiter arbiter, bytes arbiterConfiguration);
    event CompleteSetsMinted(uint256 symbioteId, uint256 amount, address target);
    event CompleteSetsBurned(uint256 symbioteId, uint256 amount, address target);
    event Claim(uint256 symbioteId);

    function createSymbiote(uint256 _creatorFee, string[] memory _outcomeSymbols, bytes32[] memory _outcomeNames, uint256 _numTicks, IArbiter _arbiter, bytes memory _arbiterConfiguration) public returns (uint256);
    function getShareTokens(uint256 _id) external view returns (ISymbioteShareToken[] memory);
    function mintCompleteSets(uint256 _id, uint256 _amount, address _receiver) public returns (bool);
    function burnCompleteSets(uint256 _id, uint256 _amount) public returns (bool);
    function claimWinnings(uint256 _id) public returns (bool);
    function withdrawCreatorFees(uint256 _id) external returns (bool);
}