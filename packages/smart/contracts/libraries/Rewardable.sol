// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

abstract contract Rewardable {
    // Rewards will be paid out over the lifetime of an event.
    // An value of zero will start rewards immediately and proceed based on the values set in master chef.

    // _Id here is the market id passed to the amm factory when creating a pool.
    function getRewardEndTime(uint256 _Id) public virtual returns (uint256);
}
