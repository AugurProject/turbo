// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

abstract contract Rewardable {
    function getRewardEndTime(uint256 _eventId) public virtual returns (uint256);
}
