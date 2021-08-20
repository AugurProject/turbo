// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

import "./Ownable.sol";

abstract contract ManagedByLink is Ownable {
    event LinkNodeChanged(address newLinkNode);

    address public linkNode;

    constructor(address _linkNode) {
        linkNode = _linkNode;
    }

    function setLinkNode(address _newLinkNode) external onlyOwner {
        linkNode = _newLinkNode;
        emit LinkNodeChanged(_newLinkNode);
    }

    modifier onlyLinkNode() {
        require(msg.sender == linkNode);
        _;
    }
}
