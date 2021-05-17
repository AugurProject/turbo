// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../libraries/IERC20Full.sol";

contract FeePot is ERC20 {
    uint256 internal constant magnitude = 2**128;

    IERC20Full public collateral;
    IERC20Full public reputationToken;

    uint256 public magnifiedFeesPerShare;

    mapping(address => uint256) public magnifiedFeesCorrections;
    mapping(address => uint256) public storedFees;

    uint256 public feeReserve;

    constructor(IERC20Full _collateral, IERC20Full _reputationToken)
        ERC20(
            string(abi.encodePacked("S_", _reputationToken.symbol())),
            string(abi.encodePacked("S_", _reputationToken.symbol()))
        )
    {
        collateral = _collateral;
        reputationToken = _reputationToken;

        require(_collateral != IERC20Full(address(0)));
    }

    function depositFees(uint256 _amount) public returns (bool) {
        collateral.transferFrom(msg.sender, address(this), _amount);
        uint256 _totalSupply = totalSupply(); // after collateral.transferFrom to prevent reentrancy causing stale totalSupply
        if (_totalSupply == 0) {
            feeReserve += _amount;
            return true;
        }
        if (feeReserve > 0) {
            _amount += feeReserve;
            feeReserve = 0;
        }
        magnifiedFeesPerShare += (_amount * magnitude) / _totalSupply;
        return true;
    }

    function withdrawableFeesOf(address _owner) public view returns (uint256) {
        return earnedFeesOf(_owner) + storedFees[_owner];
    }

    function earnedFeesOf(address _owner) public view returns (uint256) {
        uint256 _ownerBalance = balanceOf(_owner);
        uint256 _magnifiedFees = magnifiedFeesPerShare * _ownerBalance;
        return (_magnifiedFees - magnifiedFeesCorrections[_owner]) / magnitude;
    }

    function _transfer(
        address _from,
        address _to,
        uint256 _amount
    ) internal override {
        storedFees[_from] += earnedFeesOf(_from);
        super._transfer(_from, _to, _amount);

        magnifiedFeesCorrections[_from] = magnifiedFeesPerShare * balanceOf(_from);
        magnifiedFeesCorrections[_to] += magnifiedFeesPerShare * _amount;
    }

    function stake(uint256 _amount) external returns (bool) {
        reputationToken.transferFrom(msg.sender, address(this), _amount);
        _mint(msg.sender, _amount);
        magnifiedFeesCorrections[msg.sender] + magnifiedFeesPerShare * _amount;
        return true;
    }

    function exit(uint256 _amount) external returns (bool) {
        redeemInternal(msg.sender);
        _burn(msg.sender, _amount);
        reputationToken.transfer(msg.sender, _amount);
        magnifiedFeesCorrections[msg.sender] = magnifiedFeesPerShare * balanceOf(msg.sender);
        return true;
    }

    function redeem() public returns (bool) {
        redeemInternal(msg.sender);
        magnifiedFeesCorrections[msg.sender] = magnifiedFeesPerShare * balanceOf(msg.sender);
        return true;
    }

    function redeemInternal(address _account) internal {
        uint256 _withdrawableFees = withdrawableFeesOf(_account);
        if (_withdrawableFees > 0) {
            storedFees[_account] = 0;
            collateral.transfer(_account, _withdrawableFees);
        }
    }
}
