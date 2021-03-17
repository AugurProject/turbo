pragma solidity 0.5.15;
pragma experimental ABIEncoderV2;


contract IArbiter {
    function onSymbioteCreated(uint256 _id, string[] memory _outcomeSymbols, bytes32[] memory _outcomeNames, uint256 _numTicks, bytes memory _arbiterConfiguration) public;
    function getSymbioteResolution(uint256 _id) public returns (uint256[] memory);
}