pragma solidity 0.7.6;

import "../libraries/IERC20Full.sol";

interface IWeightedPoolFactory {
    function create(
        string memory name,
        string memory symbol,
        IERC20[] memory tokens,
        uint256[] memory weights,
        address[] memory assetManagers,
        uint256 swapFeePercentage,
        address owner
    ) external returns (address);
}

abstract contract IWeightedPool {}
