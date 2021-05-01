// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;
pragma abicoder v2;

import "../libraries/IERC20Full.sol";
import "../balancer/BPool.sol";
import "./TurboShareTokenFactory.sol";
import "./FeePot.sol";

abstract contract AbstractMarketFactory is TurboShareTokenFactory, Ownable {
    using SafeMathUint256 for uint256;

    // Should always have ID. Others are optional.
    // event MarketCreated(uint256 id, address settlementAddress, uint256 endTime, ...);

    // Should always have ID. Others are optional.
    // event MarketResolved(uint256 id, ...);

    event SharesMinted(uint256 id, uint256 amount, address receiver);
    event SharesBurned(uint256 id, uint256 amount, address receiver);
    event WinningsClaimed(uint256 id, uint256 amount, address indexed receiver);

    event SettlementFeeClaimed(address settlementAddress, uint256 amount, address indexed receiver);
    event ProtocolFeeClaimed(address protocol, uint256 amount);

    event ProtocolChanged(address protocol);
    event ProtocolFeeChanged(uint256 fee);
    event SettlementFeeChanged(uint256 fee);
    event StakerFeeChanged(uint256 fee);

    IERC20Full public collateral;
    FeePot public feePot;

    // fees are out of 1e18 and only apply to new markets
    uint256 public stakerFee;
    uint256 public settlementFee;
    uint256 public protocolFee;

    address public protocol; // collects protocol fees

    uint256 public accumulatedProtocolFee = 0;
    // settlement address => amount of collateral
    mapping(address => uint256) public accumulatedSettlementFees;

    // How many shares equals one collateral.
    // Necessary to account for math errors from small numbers in balancer.
    // shares = collateral / shareFactor
    // collateral = shares * shareFactor
    uint256 public shareFactor;

    struct Market {
        address settlementAddress;
        OwnedERC20[] shareTokens;
        uint256 endTime;
        OwnedERC20 winner;
        uint256 settlementFee;
        uint256 protocolFee;
        uint256 stakerFee;
    }
    Market[] internal markets;

    uint256 private constant MAX_UINT = 2**256 - 1;

    constructor(
        address _owner,
        IERC20Full _collateral,
        uint256 _shareFactor,
        FeePot _feePot,
        uint256 _stakerFee,
        uint256 _settlementFee,
        address _protocol,
        uint256 _protocolFee
    ) {
        owner = _owner; // controls fees for new markets
        collateral = _collateral;
        shareFactor = _shareFactor;
        feePot = _feePot;
        stakerFee = _stakerFee;
        settlementFee = _settlementFee;
        protocol = _protocol;
        protocolFee = _protocolFee;

        _collateral.approve(address(_feePot), MAX_UINT);
    }

    // function createMarket(address _settlementAddress, uint256 _endTime, ...) public returns (uint256);

    function resolveMarket(uint256 _id) public virtual;

    // Returns an empty struct if the market doesn't exist.
    // As a check of market existence, use `endTime != 0` on the returned struct
    function getMarket(uint256 _id) public view returns (Market memory) {
        if (_id > markets.length) {
            return Market(address(0), new OwnedERC20[](0), 0, OwnedERC20(0), 0, 0, 0);
        } else {
            return markets[_id];
        }
    }

    function marketCount() public view returns (uint256) {
        return markets.length;
    }

    // Returns factory-specific details about a market.
    // function getMarketDetails(uint256 _id) public view returns (MarketDetails memory);

    function mintShares(
        uint256 _id,
        uint256 _shareToMint,
        address _receiver
    ) public {
        Market memory _market = markets[_id];
        require(_market.endTime > 0, "No such market");

        uint256 _cost = calcCost(_shareToMint);
        collateral.transferFrom(msg.sender, address(this), _cost);

        for (uint256 _i = 0; _i < _market.shareTokens.length; _i++) {
            _market.shareTokens[_i].trustedMint(_receiver, _shareToMint);
        }

        emit SharesMinted(_id, _shareToMint, _receiver);
    }

    function burnShares(
        uint256 _id,
        uint256 _sharesToBurn,
        address _receiver
    ) public returns (uint256) {
        Market memory _market = markets[_id];
        require(_market.endTime > 0, "No such market");

        for (uint256 _i = 0; _i < _market.shareTokens.length; _i++) {
            // errors if sender doesn't have enough shares
            _market.shareTokens[_i].trustedBurn(msg.sender, _sharesToBurn);
        }

        uint256 _payout = calcCost(_sharesToBurn);
        uint256 _protocolFee = _payout.mul(_market.protocolFee).div(10**18);
        _payout = _payout.sub(_protocolFee);
        collateral.transfer(_receiver, _payout);

        emit SharesBurned(_id, _sharesToBurn, msg.sender);
        return _payout;
    }

    function claimWinnings(uint256 _id, address _receiver) public returns (uint256) {
        if (!isMarketResolved(_id)) {
            // errors if market does not exist or is not resolved or resolvable
            resolveMarket(_id);
        }

        Market memory _market = markets[_id];
        uint256 _winningShares = _market.winner.trustedBurnAll(msg.sender);
        _winningShares = (_winningShares / shareFactor) * shareFactor; // remove unusable dust

        uint256 _payout = calcCost(_winningShares);
        uint256 _settlementFee = _payout.mul(_market.settlementFee).div(10**18);
        uint256 _stakerFee = _payout.mul(_market.stakerFee).div(10**18);
        _payout = _payout.sub(_settlementFee).sub(_stakerFee);
        collateral.transfer(_receiver, _payout);

        emit WinningsClaimed(_id, _winningShares, msg.sender);
        return _payout;
    }

    function claimManyWinnings(uint256[] memory _ids, address _receiver) public returns (uint256) {
        uint256 _totalWinnings = 0;
        for (uint256 i = 0; i < _ids.length; i++) {
            _totalWinnings = _totalWinnings.add(claimWinnings(_ids[i], _receiver));
        }
        return _totalWinnings;
    }

    function claimSettlementFees(address _receiver) public returns (uint256) {
        uint256 _fees = accumulatedSettlementFees[msg.sender];
        accumulatedSettlementFees[msg.sender] = 0;
        collateral.transfer(_receiver, _fees);
        emit SettlementFeeClaimed(msg.sender, _fees, _receiver);
        return _fees;
    }

    function claimProtocolFees() public returns (uint256) {
        require(msg.sender == protocol || msg.sender == address(this), "Only protocol can claim protocol fee");
        uint256 _fees = accumulatedProtocolFee;
        accumulatedProtocolFee = 0;
        collateral.transfer(protocol, _fees);
        emit ProtocolFeeClaimed(protocol, _fees);
        return _fees;
    }

    function setSettlementFee(uint256 _newFee) external onlyOwner {
        settlementFee = _newFee;
        emit SettlementFeeChanged(_newFee);
    }

    function setStakerFee(uint256 _newFee) external onlyOwner {
        stakerFee = _newFee;
        emit StakerFeeChanged(_newFee);
    }

    function setProtocolFee(uint256 _newFee) external onlyOwner {
        protocolFee = _newFee;
        emit ProtocolFeeChanged(_newFee);
    }

    function setProtocol(address _newProtocol, bool _claimFirst) external onlyOwner {
        if (_claimFirst) {
            claimProtocolFees();
        }
        protocol = _newProtocol;
        emit ProtocolChanged(_newProtocol);
    }

    function makeMarket(
        address _settlementAddress,
        string[] memory _names,
        string[] memory _symbols,
        uint256 _endTime
    ) internal returns (Market memory _market) {
        _market = Market(
            _settlementAddress,
            createShareTokens(_names, _symbols, address(this)),
            _endTime,
            OwnedERC20(0),
            settlementFee,
            protocolFee,
            stakerFee
        );
    }

    function isMarketResolved(uint256 _id) public view returns (bool) {
        Market memory _market = markets[_id];
        return _market.winner != OwnedERC20(0);
    }

    // shares => collateral
    function calcCost(uint256 _shares) public view returns (uint256) {
        require(
            _shares >= shareFactor && _shares % shareFactor == 0,
            "Shares must be both greater than (or equal to) and divisible by shareFactor"
        );
        return _shares / shareFactor;
    }

    // collateral => shares
    function calcShares(uint256 _collateralIn) public view returns (uint256) {
        return _collateralIn * shareFactor;
    }

    function onTransferOwnership(address, address) internal override {}
}
