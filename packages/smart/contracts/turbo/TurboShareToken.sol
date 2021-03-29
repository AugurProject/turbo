// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

import "./ITurboShareToken.sol";
import "../libraries/VariableSupplyToken.sol";
import "./ITurboHatchery.sol";
import "../libraries/Ownable.sol";


contract TurboShareToken is ITurboShareToken, VariableSupplyToken, Ownable {
    
    bytes32 public name;
    string public symbol;

    constructor(string memory _symbol, bytes32 _name, ITurboHatchery _hatchery) {
        symbol = _symbol;
        name = _name;
        owner = address(_hatchery);
    }

    function allowance(address _owner, address _spender) public override(ITurboShareToken, ERC20) view returns (uint256) {
        return ERC20.allowance(_owner, _spender);
    }
    
    function transfer(address _recipient, uint256 _amount) public override(ITurboShareToken, ERC20) returns (bool) {
        return ERC20.transfer(_recipient, _amount);
    }

    function approve(address _spender, uint256 _amount) public override(ITurboShareToken, ERC20) returns (bool) {
        return ERC20.approve(_spender, _amount);
    }

    function transferFrom(address _sender, address _recipient, uint256 _amount) public override(ITurboShareToken, ERC20) returns (bool) {
        return ERC20.transferFrom(_sender, _recipient, _amount);
    }

    function balanceOf(address _account) public override(ITurboShareToken, ERC20) view returns (uint256) {
        return ERC20.balanceOf(_account);
    }


    function trustedTransfer(address _from, address _to, uint256 _amount) onlyOwner override external {
        _transfer(_from, _to, _amount);
    }


    function totalSupply2() override external view returns (uint256) {
        return totalSupply;
    }


    function trustedMint(address _target, uint256 _amount) onlyOwner override external {
        mint(_target, _amount);
    }

    function trustedBurn(address _target, uint256 _amount) onlyOwner override external {
        burn(_target, _amount);
    }

    function trustedBurnAll(address _target) override external onlyOwner returns (uint256){
        uint256 _balance = balanceOf(_target);
        burn(_target, _balance);
        return _balance;
    }

    function onTokenTransfer(address _from, address _to, uint256 _value) override internal {}
    function onTransferOwnership(address, address) override internal {}
}