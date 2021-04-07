// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;
import "@chainlink/contracts/src/v0.6/ChainlinkClient.sol";

contract TheRundownChainlink is ChainlinkClient {
    uint256 oraclePayment;
    uint256 public score;

    ChainlinkRequestInterface private oracle;

    constructor(uint256 _oraclePayment) public {
        oraclePayment = _oraclePayment;
    }

    function requestScore(
        address _oracle,
        bytes32 _jobId,
        string memory _matchId
    ) public {
        // changed this to address(this)
        Chainlink.Request memory req = buildChainlinkRequest(_jobId, address(this), this.fulfill.selector);
        req.add("matchId", _matchId);
        sendChainlinkRequestTo(_oracle, req, oraclePayment);
    }

    function fulfill(bytes32 _requestId, uint256 _score) public recordChainlinkFulfillment(_requestId) {
        score = _score;
    }

     function setChainlinkTokenAddress(address _link) public {
        setChainlinkToken(_link);
    }

    function setPublicChainlinkTokenAddress() public {
        setPublicChainlinkToken();
    }
}
