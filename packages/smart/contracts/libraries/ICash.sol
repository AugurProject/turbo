// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

import "./IERC20.sol";


interface ICash is IERC20 {
    function faucet(uint256 _amount) external returns (bool);
    function decimals() override external view returns (uint8);
}
