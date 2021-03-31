// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

import "../libraries/IERC20.sol";

interface ITurboShareToken is IERC20 {
    function trustedTransfer(
        address _from,
        address _to,
        uint256 _amount
    ) external;

    function trustedMint(address _target, uint256 _amount) external;

    function trustedBurn(address _target, uint256 _amount) external;

    function trustedBurnAll(address _target) external returns (uint256);
}
