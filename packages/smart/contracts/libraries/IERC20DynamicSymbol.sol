// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

import "./IERC20.sol";


abstract contract IERC20DynamicSymbol is IERC20 {
    function symbol() virtual public view returns (string memory);
}
