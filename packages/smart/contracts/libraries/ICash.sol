// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

import "./IERC20.sol";


abstract contract ICash is IERC20 {
    function faucet(uint256 _amount) virtual public returns (bool);
}
