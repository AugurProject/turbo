// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;
pragma abicoder v2;

import "../libraries/IERC20Full.sol";
import "../balancer/BPool.sol";
import "./TurboShareTokenFactory.sol";
import "./FeePot.sol";

abstract contract AbstractMarketFactory is TurboShareTokenFactory {
    using SafeMathUint256 for uint256;

    // Should always have ID. Others are optional.
    // event MarketCreated(uint256 id, address creator, uint256 endTime, ...);

    // Should always have ID. Others are optional.
    // event MarketResolved(uint256 id, ...);

    event SharesMinted(uint256 id, uint256 amount, address receiver);
    event SharesBurned(uint256 id, uint256 amount, address receiver);
    event WinningsClaimed(uint256 id, uint256 amount, address indexed receiver);

    IERC20Full public collateral;
    FeePot public feePot;
    uint256 public stakerFee;
    uint256 public creatorFee;
    // creator address => amount of collateral
    mapping(address => uint256) public accumulatedCreatorFees;

    // How many shares equals one collateral.
    // Necessary to account for math errors from small numbers in balancer.
    // shares = collateral / shareFactor
    // collateral = shares * shareFactor
    uint256 public shareFactor;

    struct Market {
        address creator;
        OwnedERC20[] shareTokens;
        uint256 endTime;
        OwnedERC20 winner;
        uint256 creatorFee;
    }
    Market[] internal markets;

    uint256 private constant MAX_UINT = 2**256 - 1;

    constructor(
        IERC20Full _collateral,
        uint256 _shareFactor,
        FeePot _feePot,
        uint256 _stakerFee,
        uint256 _creatorFee
    ) {
        collateral = _collateral;
        shareFactor = _shareFactor;
        feePot = _feePot;
        stakerFee = _stakerFee;
        creatorFee = _creatorFee;

        _collateral.approve(address(_feePot), MAX_UINT);
    }

    // function createMarket(address _creator, uint256 _endTime, ...) public returns (uint256);

    function resolveMarket(uint256 _id) public virtual;

    // Returns an empty struct if the market doesn't exist.
    // As a check of market existence, use `endTime != 0` on the returned struct
    function getMarket(uint256 _id) public view returns (Market memory) {
        if (_id > markets.length) {
            return Market(address(0), new OwnedERC20[](0), 0, OwnedERC20(0), 0);
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

        emit SharesBurned(_id, _sharesToBurn, msg.sender);
        return payout(_id, _sharesToBurn, _receiver);
    }

    function claimWinnings(uint256 _id, address _receiver) public returns (uint256) {
        Market memory _market = markets[_id];

        // errors if market does not exist or is not resolved or resolvable
        if (_market.winner == OwnedERC20(0)) {
            resolveMarket(_id);
        }

        uint256 _winningShares = _market.winner.trustedBurnAll(msg.sender);
        _winningShares = (_winningShares / shareFactor) * shareFactor; // remove unusable dust

        emit WinningsClaimed(_id, _winningShares, msg.sender);
        return payout(_id, _winningShares, _receiver);
    }

    function claimManyWinnings(uint256[] memory _ids, address _receiver) public returns (uint256) {
        uint256 _totalWinnings = 0;
        for (uint256 i = 0; i < _ids.length; i++) {
            _totalWinnings = _totalWinnings.add(claimWinnings(_ids[i], _receiver));
        }
        return _totalWinnings;
    }

    function claimCreatorFees(address _receiver) public {
        uint256 _fees = accumulatedCreatorFees[msg.sender];
        accumulatedCreatorFees[msg.sender] = 0;
        collateral.transfer(_receiver, _fees);
    }

    function payout(
        uint256 _id,
        uint256 _shares,
        address _payee
    ) internal returns (uint256) {
        uint256 _payout = calcCost(_shares);
        Market memory _market = markets[_id];

        uint256 _creatorFee = _market.creatorFee.mul(_payout) / 10**18;
        uint256 _stakerFee = stakerFee.mul(_payout) / 10**18;

        accumulatedCreatorFees[_market.creator] += _creatorFee;
        feePot.depositFees(_stakerFee);
        collateral.transfer(_payee, _payout.sub(_creatorFee).sub(_stakerFee));

        return _payout;
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
}
