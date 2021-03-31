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
    uint8 private _decimals;
    string public symbol;

    constructor(
        string memory _name,
        string memory _symbol,
        uint8 decimals_
    ) {
        name = _name;
        symbol = _symbol;
        _decimals = decimals_;
    }

    function decimals() public view virtual override(ERC20, ICash) returns (uint8) {
        return _decimals;
    }

    function faucet(uint256 _amount) public override returns (bool) {
        mint(msg.sender, _amount);
        return true;
    }

    function getTypeName() public pure override returns (bytes32) {
        return "Cash";
    }

    function onTokenTransfer(
        address _from,
        address _to,
        uint256 _value
    ) internal override {}
}
