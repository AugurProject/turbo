// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;
import "@chainlink/contracts/src/v0.8/dev/ChainlinkClient.sol";

contract TheRundownChainlink is ChainlinkClient {
    using Chainlink for Chainlink.Request;

    uint256 public score;
    address private oracle;
    bytes32 private jobId;
    uint256 private fee;

    constructor() {
        setPublicChainlinkToken();
        oracle = 0x56dd6586DB0D08c6Ce7B2f2805af28616E082455;
        jobId = "dbb65efc02d34cddb920eca1bec22ade";
        fee = 10**17;
    }

    function requestScore(string memory _matchId) public {
        Chainlink.Request memory request = buildChainlinkRequest(jobId, address(this), this.fulfill.selector);
        request.add("matchId", _matchId);
        sendChainlinkRequestTo(oracle, request, fee);
    }

    function fulfill(bytes32 _requestId, uint256 _score) public recordChainlinkFulfillment(_requestId) {
        score = _score;
    }
}
