// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;
pragma experimental ABIEncoderV2;


interface IArbiter {
    function onTurboCreated(uint256 _id, string[] memory _outcomeSymbols, bytes32[] memory _outcomeNames, uint256 _numTicks, bytes memory _arbiterConfiguration) external;
    function getTurboResolution(uint256 _id) external returns (uint256[] memory);
}