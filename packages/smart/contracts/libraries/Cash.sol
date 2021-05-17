// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title Cash
 * @dev Test contract for collateral
 */
contract Cash is ERC20 {
    uint8 private _decimals;

    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_
    ) ERC20(name_, symbol_) {
        _decimals = decimals_;
    }

    function decimals() public view virtual override(ERC20) returns (uint8) {
        return _decimals;
    }

    function faucet(uint256 _amount) public returns (bool) {
        _mint(msg.sender, _amount);
        return true;
    }
}
