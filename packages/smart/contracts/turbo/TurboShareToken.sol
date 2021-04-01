// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

import "./ITurboShareToken.sol";
import "../libraries/VariableSupplyToken.sol";
import "./ITurboHatchery.sol";
import "../libraries/Ownable.sol";

contract TurboShareToken is ITurboShareToken, VariableSupplyToken, Ownable {
    bytes32 public name;
    string public symbol;

    constructor(
        string memory _symbol,
        bytes32 _name,
        ITurboHatchery _hatchery
    ) {
        symbol = _symbol;
        name = _name;
        owner = address(_hatchery);
    }

    function trustedTransfer(
        address _from,
        address _to,
        uint256 _amount
    ) external override onlyOwner {
        _transfer(_from, _to, _amount);
    }

    function trustedMint(address _target, uint256 _amount) external override onlyOwner {
        mint(_target, _amount);
    }

    function trustedBurn(address _target, uint256 _amount) external override onlyOwner {
        burn(_target, _amount);
    }

    function trustedBurnAll(address _target) external override onlyOwner returns (uint256) {
        uint256 _balance = balanceOf(_target);
        burn(_target, _balance);
        return _balance;
    }

    function onTokenTransfer(
        address _from,
        address _to,
        uint256 _value
    ) internal override {}

    function onTransferOwnership(address, address) internal override {}
}
