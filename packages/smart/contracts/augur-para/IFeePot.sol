// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

import "../libraries/IERC20.sol";
import "../libraries/IERC20DynamicSymbol.sol";


abstract contract IFeePot is IERC20 {
    function depositFees(uint256 _amount) virtual external returns (bool);
    function withdrawableFeesOf(address _owner) virtual external view returns(uint256);
    function redeem() virtual external returns (bool);
    function collateral() virtual external view returns (IERC20);
    function reputationToken() virtual external view returns (IERC20DynamicSymbol);
}