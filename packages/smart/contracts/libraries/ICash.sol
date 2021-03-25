pragma solidity 0.7.3;

import "./IERC20.sol";


contract ICash is IERC20 {
    function faucet(uint256 _amount) public returns (bool);
}
