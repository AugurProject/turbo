// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;
pragma experimental ABIEncoderV2;

import "./ITurboShareToken.sol";
import "../libraries/SafeMathUint256.sol";
import "../libraries/IERC20.sol";
import "../augur-para/IFeePot.sol";
import "./ITurboShareTokenFactory.sol";
import "./IArbiter.sol";
import "./ITurboHatchery.sol";

contract TurboHatchery is ITurboHatchery {
    using SafeMathUint256 for uint256;

    uint256 private constant MIN_OUTCOMES = 2; // Does not Include Invalid
    uint256 private constant MAX_OUTCOMES = 7; // Does not Include Invalid
    uint256 private constant MAX_FEE = 2 * 10**16; // 2%
    address private constant NULL_ADDRESS = address(0);
    uint256 private constant MAX_UINT = 2**256 - 1;

    Turbo[] internal _turbos;
    ITurboShareTokenFactory internal _tokenFactory;
    IFeePot internal _feePot;
    IERC20 internal _collateral;

    constructor(ITurboShareTokenFactory tokenFactory_, IFeePot feePot_) {
        _tokenFactory = tokenFactory_;
        _feePot = feePot_;
        _collateral = _feePot.collateral();
        _collateral.approve(address(_feePot), MAX_UINT);
    }

    function turbos(uint256 _turboId) override external view returns (Turbo[] memory) {
        return _turbos[_turboId];
    }

     function tokenFactory() public override view virtual returns (ITurboShareTokenFactory) {
        return _tokenFactory;
    }

     function feePot() public override view virtual returns (IFeePot) {
        return _feePot;
    }

     function collateral() public override view virtual returns (IERC20) {
        return _collateral;
    }

    function getTurboLength() override external view returns (uint256) {
        return _turbos.length;
    }
    
    function createTurbo(uint256 _index, uint256 _creatorFee, string[] memory _outcomeSymbols, bytes32[] memory _outcomeNames, uint256 _numTicks, IArbiter _arbiter, bytes memory _arbiterConfiguration) override public returns (uint256) {
        require(_numTicks.isMultipleOf(2), "TurboHatchery.createTurbo: numTicks must be multiple of 2");
        require(_numTicks >= _outcomeSymbols.length, "TurboHatchery.createTurbo: numTicks lower than numOutcomes");
        require(MIN_OUTCOMES <= _outcomeSymbols.length && _outcomeSymbols.length <= MAX_OUTCOMES, "TurboHatchery.createTurbo: Number of outcomes is not acceptable");
        require(_outcomeSymbols.length == _outcomeNames.length, "TurboHatchery.createTurbo: outcome names and outcome symbols differ in length");
        require(_creatorFee <= MAX_FEE, "TurboHatchery.createTurbo: market creator fee too high");
        uint256 _id = _turbos.length;
        {
            _turbos.push(Turbo(
                msg.sender,
                _creatorFee,
                _numTicks,
                _arbiter,
                _tokenFactory.createShareTokens(_outcomeNames, _outcomeSymbols),
                0
            ));
        }
        _arbiter.onTurboCreated(_id, _outcomeSymbols, _outcomeNames, _numTicks, _arbiterConfiguration);
        emit TurboCreated(_id, _creatorFee, _outcomeSymbols, _outcomeNames, _numTicks, _arbiter, _arbiterConfiguration, _index);
        return _id;
    }

    function getShareTokens(uint256 _id) override external view returns (ITurboShareToken[] memory) {
        return _turbos[_id].shareTokens;
    }

    function mintCompleteSets(uint256 _id, uint256 _amount, address _receiver) override public returns (bool) {
        uint256 _numTicks = _turbos[_id].numTicks;
        uint256 _cost = _amount.mul(_numTicks);
        _collateral.transferFrom(msg.sender, address(this), _cost);
        for (uint256 _i = 0; _i < _turbos[_id].shareTokens.length; _i++) {
            _turbos[_id].shareTokens[_i].trustedMint(_receiver, _amount);
        }
        emit CompleteSetsMinted(_id, _amount, _receiver);
        return true;
    }

    function burnCompleteSets(uint256 _id, uint256 _amount, address _receiver) override public returns (bool) {
        for (uint256 _i = 0; _i < _turbos[_id].shareTokens.length; _i++) {
            _turbos[_id].shareTokens[_i].trustedBurn(msg.sender, _amount);
        }
        uint256 _numTicks = _turbos[_id].numTicks;
        payout(_id, _receiver, _amount.mul(_numTicks), false, false);
        emit CompleteSetsBurned(_id, _amount, msg.sender);
        return true;
    }

    function claimWinnings(uint256 _id) override public returns (bool) {
        // We expect this to revert or return an empty array if the turbo is not resolved
        uint256[] memory _winningPayout = _turbos[_id].arbiter.getTurboResolution(_id);
        require(_winningPayout.length > 0, "market not resolved");
        uint256 _winningBalance = 0;
        for (uint256 _i = 0; _i < _turbos[_id].shareTokens.length; _i++) {
            _winningBalance = _winningBalance.add(_turbos[_id].shareTokens[_i].trustedBurnAll(msg.sender) * _winningPayout[_i]);
        }
        payout(_id, msg.sender, _winningBalance, true, _winningPayout[0] != 0);
        emit Claim(_id);
        return true;
    }

    function payout(uint256 _id, address _payee, uint256 _payout, bool _finalized, bool _invalid) private {
        uint256 _creatorFee = _turbos[_id].creatorFee.mul(_payout) / 10**18;

        if (_finalized) {
            if (_invalid) {
                _feePot.depositFees(_creatorFee + _turbos[_id].creatorFees);
                _turbos[_id].creatorFees = 0;
            } else {
                _collateral.transfer(_turbos[_id].creator, _creatorFee);
            }
        } else {
            _turbos[_id].creatorFees = _turbos[_id].creatorFees.add(_creatorFee);
        }

        _collateral.transfer(_payee, _payout.sub(_creatorFee));
    }

    function withdrawCreatorFees(uint256 _id) override external returns (bool) {
        // We expect this to revert if the turbo is not resolved
        uint256[] memory _winningPayout = _turbos[_id].arbiter.getTurboResolution(_id);
        require(_winningPayout.length > 0, "market not resolved");
        require(_winningPayout[0] == 0, "Can only withdraw creator fees from a valid market");

        _collateral.transfer(_turbos[_id].creator, _turbos[_id].creatorFees);

        return true;
    }
}
