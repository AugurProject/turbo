// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;
pragma abicoder v2;

import "../libraries/Ownable.sol";
import "./SportsLinkMarketFactory.sol";

contract SportsLinkProxy is SportsLinkInterface, Ownable {
    // Link API

    function createMarket(bytes32 _payload) public override returns (uint256[3] memory _ids) {
        creationPayloads.push(_payload);
        return marketFactory.createMarket(_payload);
    }

    function trustedResolveMarkets(bytes32 _payload) public override {
        resolutionPayloads.push(_payload);
        return marketFactory.trustedResolveMarkets(_payload);
    }

    function getEventDetails(uint256 _eventId) external view override returns (EventDetails memory) {
        return marketFactory.getEventDetails(_eventId);
    }

    function isEventRegistered(uint256 _eventId) public view override returns (bool) {
        return marketFactory.isEventRegistered(_eventId);
    }

    function isEventResolvable(uint256 _eventId) public view override returns (bool) {
        return marketFactory.isEventResolvable(_eventId);
    }

    function listResolvableEvents() external view override returns (uint256[] memory) {
        return marketFactory.listResolvableEvents();
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
    bytes32[] public creationPayloads;
    bytes32[] public resolutionPayloads;

    constructor(address _owner, SportsLinkMarketFactory _marketFactory) {
        owner = _owner;
        marketFactory = _marketFactory;
    }

    function setMarketFactory(SportsLinkMarketFactory _newAddress) external onlyOwner {
        marketFactory = _newAddress;
    }

    function onTransferOwnership(address, address) internal override {}
}
