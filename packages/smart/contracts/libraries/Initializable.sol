// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

contract Initializable {
    bool private initialized = false;

    modifier beforeInitialized {
        require(!initialized);
        _;
    }

    function endInitialization() internal beforeInitialized {
        initialized = true;
    }

    function getInitialized() public view returns (bool) {
        return initialized;
    }
}
