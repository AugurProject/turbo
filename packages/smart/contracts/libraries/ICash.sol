pragma solidity 0.5.15;

import "./IERC20.sol";


contract ICash is IERC20 {
    function faucet(uint256 _amount) public returns (bool);
}
