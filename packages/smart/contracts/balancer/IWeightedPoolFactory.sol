pragma solidity 0.7.6;

import "../libraries/IERC20Full.sol";
pragma abicoder v2;
// import "@balancer-labs/v2-vault/contracts/interfaces/IVault.sol";

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

interface IAsset {
    // solhint-disable-previous-line no-empty-blocks
}

interface IVault {
    function getPoolTokens(bytes32 poolId)
        external
        view
        returns (
            IERC20[] memory tokens,
            uint256[] memory balances,
            uint256 lastChangeBlock
        );

    function joinPool(
        bytes32 poolId,
        address sender,
        address recipient,
        JoinPoolRequest memory request
    ) external payable;

    struct JoinPoolRequest {
        IAsset[] assets;
        uint256[] maxAmountsIn;
        bytes userData;
        bool fromInternalBalance;
    }
}

abstract contract IWeightedPool is IERC20 {
    function getPoolId() public view virtual returns (bytes32 poolID);
    function getVault() public view virtual returns (IVault);
}
