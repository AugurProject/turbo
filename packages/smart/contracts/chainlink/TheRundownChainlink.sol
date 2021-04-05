// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;
import "@chainlink/contracts/src/v0.6/ChainlinkClient.sol";

contract TheRundownChainlink is ChainlinkClient {
    uint256 oraclePayment;
    uint256 public score;

    ChainlinkRequestInterface private oracle;

    constructor(uint256 _oraclePayment) public {
        setPublicChainlinkToken();
        oraclePayment = _oraclePayment;
    }

    function requestScore(
        address _oracle,
        bytes32 _jobId,
        string memory _matchId
    ) public {
        Chainlink.Request memory req = buildChainlinkRequest(_jobId, this, this.fulfill.selector);
        req.add("matchId", _matchId);
        sendChainlinkRequestTo(_oracle, req, oraclePayment);
    }

    function fulfill(bytes32 _requestId, uint256 _score) public recordChainlinkFulfillment(_requestId) {
        score = _score;
    }
}
