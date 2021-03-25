pragma solidity 0.7.6;

import "./IERC20.sol";


contract IERC20DynamicSymbol is IERC20 {
    function symbol() public view returns (string memory);
}
