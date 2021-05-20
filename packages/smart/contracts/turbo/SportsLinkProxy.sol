// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

import "../libraries/Ownable.sol";
import "./SportsLinkMarketFactory.sol";

// The replay functionality only works under a test env because an owner is needed.
// In production, the owner can be set to the link node for potential future work.
contract SportsLinkProxy is Ownable {
    // Link API

    function createMarket(bytes32 _payload) public returns (uint256[3] memory _ids) {
        require(msg.sender == linkNode, "Only link node can create markets");
        creationPayloads.push(_payload);
        return marketFactory.createMarket(_payload);
    }

    function trustedResolveMarkets(bytes32 _payload) public {
        require(msg.sender == linkNode, "Only link node can resolve markets");
        resolutionPayloads.push(_payload);
        return marketFactory.trustedResolveMarkets(_payload);
    }

    function getEventMarkets(uint256 _eventId) external view returns (uint256[3] memory) {
        return marketFactory.getEventMarkets(_eventId);
    }

    function isEventRegistered(uint256 _eventId) public view returns (bool) {
        return marketFactory.isEventRegistered(_eventId);
    }

    function isEventResolved(uint256 _eventId) public view returns (bool) {
        return marketFactory.isEventResolved(_eventId);
    }

    // Replay
    // The replay strategy is to start at the latest market and decement until error.

    function replayCreate(uint256 i) public onlyOwner {
        marketFactory.createMarket(creationPayloads[i]);
    }

    function replayResolve(uint256 i) public onlyOwner {
        marketFactory.trustedResolveMarkets(resolutionPayloads[i]);
    }

    function creationPayloadsLength() public view returns (uint256) {
        return creationPayloads.length;
    }

    function resolutionPayloadsLength() public view returns (uint256) {
        return resolutionPayloads.length;
    }

    // Misc

    SportsLinkMarketFactory public marketFactory;
    address public linkNode;
    bytes32[] public creationPayloads;
    bytes32[] public resolutionPayloads;

    constructor(
        address _owner,
        SportsLinkMarketFactory _marketFactory,
        address _linkNode
    ) {
        owner = _owner; // test controller
        marketFactory = _marketFactory;
        linkNode = _linkNode;
    }

    function setMarketFactory(SportsLinkMarketFactory _newAddress) external onlyOwner {
        marketFactory = _newAddress;
    }

    function setLinkNode(address _newLinkNode) external onlyOwner {
        linkNode = _newLinkNode;
    }

    function onTransferOwnership(address, address) internal override {}
}
