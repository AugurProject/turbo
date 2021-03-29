// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

import "./IERC20.sol";


interface IERC20DynamicSymbol is IERC20 {
    function symbol() external view returns (string memory);
}
