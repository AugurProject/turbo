// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;
import "@chainlink/contracts/src/v0.7/ChainlinkClient.sol";

contract TheRundownChainlink is ChainlinkClient {
    using Chainlink for Chainlink.Request;

    uint256 public score;
    uint256 private fee;

    constructor() {
        setPublicChainlinkToken();
        fee = 10**17;
    }

    function requestScore(string memory _matchId, address oracle, bytes32 jobId) public {
        Chainlink.Request memory request = buildChainlinkRequest(jobId, address(this), this.fulfill.selector);
        request.add("matchId", _matchId);
        sendChainlinkRequestTo(oracle, request, fee);
    }

    function fulfill(bytes32 _requestId, uint256 _score) public recordChainlinkFulfillment(_requestId) {
        score = _score;
    }
}
