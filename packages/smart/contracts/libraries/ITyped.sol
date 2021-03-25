// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;


abstract contract ITyped {
    function getTypeName() virtual public view returns (bytes32);
}
