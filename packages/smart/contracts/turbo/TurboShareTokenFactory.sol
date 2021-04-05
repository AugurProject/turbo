// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;
pragma experimental ABIEncoderV2;

import "../libraries/Initializable.sol";
import "./ITurboShareToken.sol";
import "./TurboShareToken.sol";
import "./ITurboHatchery.sol";

contract TurboShareTokenFactory is Initializable {
    ITurboHatchery public hatchery;

    function initialize(ITurboHatchery _hatchery) public beforeInitialized returns (bool) {
        endInitialization();
        hatchery = _hatchery;
        return true;
    }

    function createShareTokens(bytes32[] calldata _names, string[] calldata _symbols)
        external
        returns (ITurboShareToken[] memory)
    {
        require(msg.sender == address(hatchery), "Only hatchery may create new share tokens");
        uint256 _numOutcomes = _names.length;
        ITurboShareToken[] memory _tokens = new ITurboShareToken[](_numOutcomes);
        for (uint256 _i = 0; _i < _numOutcomes; _i++) {
            _tokens[_i] = new TurboShareToken(_symbols[_i], _names[_i ], hatchery);
        }
        return _tokens;
    }
}
