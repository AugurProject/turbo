// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

import "../libraries/Ownable.sol";
import "./SportsLinkMarketFactory.sol";

// The replay functionality only works under a test env because an owner is needed.
// In production, the owner can be set to the link node for potential future work.
contract SportsLinkProxy is Ownable {
    // Link API

    function createMarket( 
        uint256 _eventId,
        uint256 _homeTeamId,
        uint256 _awayTeamId,
        uint256 _startTimestamp,
        int256 _homeSpread,
        uint256 _totalScore,
        bool _makeSpread,
        bool _makeTotalScore
    ) public returns (uint256[3] memory _ids) {
        require(msg.sender == linkNode, "Only link node can create markets");
        creationPayloads.push(markerData({
            eventId : _eventId,
            homeTeamId: _homeTeamId,
            awayTeamId: _awayTeamId,
            startTimestamp: _startTimestamp,
            homeSpread: _homeSpread,
            totalScore: _totalScore,
            makeSpread: _makeSpread,
            makeTotalScore: _makeTotalScore
        }));
        // creationPayloads.push(_payload);
        return marketFactory.createMarket(
            _eventId,
            _homeTeamId,
            _awayTeamId,
            _startTimestamp,
            _homeSpread,
            _totalScore,
            _makeSpread,
            _makeTotalScore
        );
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
        marketFactory.createMarket(
            creationPayloads[i].eventId, 
            creationPayloads[i].homeTeamId, 
            creationPayloads[i].awayTeamId, 
            creationPayloads[i].startTimestamp, 
            creationPayloads[i].homeSpread, 
            creationPayloads[i].totalScore, 
            creationPayloads[i].makeSpread, 
            creationPayloads[i].makeTotalScore
        );
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

    struct markerData {
        uint256 eventId;
        uint256 homeTeamId;
        uint256 awayTeamId;
        uint256 startTimestamp;
        int256 homeSpread;
        uint256 totalScore;
        bool makeSpread;
        bool makeTotalScore;
    }
    
    SportsLinkMarketFactory public marketFactory;
    address public linkNode;
    markerData[] public creationPayloads;
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
