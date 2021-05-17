// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

interface IOwnable {
    function getOwner() external view returns (address);

    function transferOwnership(address _newOwner) external returns (bool);
}
