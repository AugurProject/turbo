pragma solidity 0.5.15;
pragma experimental ABIEncoderV2;

import "./ISymbioteShareToken.sol";


interface ISymbioteShareTokenFactory {
    function createShareTokens(bytes32[] calldata _names, string[] calldata _symbols) external returns (ISymbioteShareToken[] memory tokens);
}