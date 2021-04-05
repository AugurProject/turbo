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
    event WinningsClaimed(uint256 id, uint256 amount, address receiver);

    IERC20Full public collateral;
    FeePot public feePot;
    uint256 public stakerFee;
    uint256 public creatorFee;

    struct Market {
        address creator;
        OwnedERC20[] shareTokens;
        uint256 endTime;
        OwnedERC20 winner;
    }
    Market[] internal markets;

    uint256 private constant MAX_UINT = 2**256 - 1;

    constructor(
        IERC20Full _collateral,
        FeePot _feePot,
        uint256 _stakerFee,
        uint256 _creatorFee
    ) {
        collateral = _collateral;
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
            return Market(address(0), new OwnedERC20[](0), 0, OwnedERC20(0));
        } else {
            return markets[_id];
        }
    }

    // Returns factory-specific details about a market.
    // function getMarketDetails(uint256 _id) public view returns (MarketDetails memory);

    function mintShares(
        uint256 _id,
        uint256 _amount,
        address _receiver
    ) public {
        Market memory _market = markets[_id];
        require(_market.endTime > 0, "No such market");

        collateral.transferFrom(msg.sender, address(this), _amount);

        for (uint256 _i = 0; _i < _market.shareTokens.length; _i++) {
            _market.shareTokens[_i].trustedMint(_receiver, _amount);
        }

        emit SharesMinted(_id, _amount, _receiver);
    }

    function burnShares(
        uint256 _id,
        uint256 _amount,
        address _receiver
    ) public {
        Market memory _market = markets[_id];
        require(_market.endTime > 0, "No such market");

        for (uint256 _i = 0; _i < _market.shareTokens.length; _i++) {
            // errors if sender doesn't have enough shares
            _market.shareTokens[_i].trustedBurn(msg.sender, _amount);
        }

        payout(_id, _amount, _receiver);

        emit SharesBurned(_id, _amount, msg.sender);
    }

    function claimWinnings(uint256 _id, address _receiver) public returns (uint256) {
        Market memory _market = markets[_id];

        // errors if market does not exist or is not resolved or resolvable
        if (_market.winner == OwnedERC20(0)) {
            resolveMarket(_id);
        }

        uint256 _winnings = _market.winner.trustedBurnAll(msg.sender);

        payout(_id, _winnings, _receiver);

        emit WinningsClaimed(_id, _winnings, msg.sender);
        return _winnings;
    }

    function payout(
        uint256 _id,
        uint256 _payout,
        address _payee
    ) internal {
        Market memory _market = markets[_id];

        uint256 _creatorFee = creatorFee.mul(_payout) / 10**18;
        uint256 _stakerFee = stakerFee.mul(_payout) / 10**18;

        collateral.transfer(_market.creator, _creatorFee);
        feePot.depositFees(_stakerFee);
        collateral.transfer(_payee, _payout.sub(_creatorFee).sub(_stakerFee));
    }
}
