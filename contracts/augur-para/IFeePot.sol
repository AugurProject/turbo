pragma solidity 0.5.15;

import "../libraries/IERC20.sol";


contract IFeePot is IERC20 {
    function depositFees(uint256 _amount) external returns (bool);
    function withdrawableFeesOf(address _owner) external view returns(uint256);
    function redeem() external returns (bool);
    function collateral() external view returns (IERC20);
}