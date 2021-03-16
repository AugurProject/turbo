pragma solidity 0.5.15;

import "../libraries/IERC20.sol";
import "./IParaUniverse.sol";
import "./IParaAugur.sol";


contract IParaOICash is IERC20 {
    function deposit(uint256 _amount) external returns (bool);
    function withdraw(uint256 _amount) external returns (bool _alwaysTrue, uint256 _payout);
    function initialize(IParaAugur _augur, IParaUniverse _universe) external;
    function approveFeePot() external;
}
