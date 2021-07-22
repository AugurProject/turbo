// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

abstract contract Versioned {
    string internal version;

    constructor(string memory _version) {
        version = _version;
    }

    function getVersion() public view returns (string memory) {
        return version;
    }
}
