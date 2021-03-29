// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

import "./ICash.sol";
import "./ITyped.sol";
import "./VariableSupplyToken.sol";


/**
 * @title Cash
 * @dev Test contract for collateral
 */
contract Cash is VariableSupplyToken, ITyped, ICash {
    using SafeMathUint256 for uint256;

    string public name;
    uint8 public decimals;
    string public symbol;

constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }

    function faucet(uint256 _amount) override public returns (bool) {
        mint(msg.sender, _amount);
        return true;
    }

    function getTypeName() override public pure returns (bytes32) {
        return "Cash";
    }

    function onTokenTransfer(address _from, address _to, uint256 _value) override internal {}
}