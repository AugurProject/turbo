pragma solidity 0.5.15;

import "../../libraries/IERC20.sol";
import "../IAugur.sol";


contract IOICash is IERC20 {
    function initialize(IAugur _augur, IUniverse _universe) external;
}
