// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

import "@openzeppelin/contracts/proxy/Proxy.sol";
import "../libraries/Ownable.sol";

contract SportsLinkProxy is Proxy, Ownable {
    address public marketFactory;

    constructor(address _owner, address _marketFactory) {
        owner = _owner;
        marketFactory = _marketFactory;
    }

    function setMarketFactory(address _newAddress) external onlyOwner {
        marketFactory = _newAddress;
    }

    function _implementation() internal view override returns (address) {
        return marketFactory;
    }

    function onTransferOwnership(address, address) internal override {}
}
