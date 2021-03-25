// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;


abstract contract IOwnable {
    function getOwner() virtual public view returns (address);
    function transferOwnership(address _newOwner) virtual public returns (bool);
}
