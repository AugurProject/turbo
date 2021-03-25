pragma solidity 0.7.6;

import "../libraries/IERC20.sol";
import "../libraries/IERC20DynamicSymbol.sol";


abstract contract IFeePot is IERC20 {
    function depositFees(uint256 _amount) external returns (bool);
    function withdrawableFeesOf(address _owner) external view returns(uint256);
    function redeem() external returns (bool);
    function collateral() external view returns (IERC20);
    function reputationToken() external view returns (IERC20DynamicSymbol);
}