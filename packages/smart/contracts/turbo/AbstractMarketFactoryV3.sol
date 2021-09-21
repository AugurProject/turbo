// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;
pragma abicoder v2;

import "../libraries/IERC20Full.sol";
import "../balancer/BPool.sol";
import "./TurboShareTokenFactory.sol";
import "./FeePot.sol";
import "../libraries/Rewardable.sol";

abstract contract AbstractMarketFactoryV3 is TurboShareTokenFactory, Ownable, Rewardable {
    using SafeMathUint256 for uint256;

    event MarketCreated(uint256 id, string[] names, uint256[] initialOdds);
    event MarketResolved(uint256 id, address winner, uint256 winnerIndex, string winnerName);
    event MarketActivated(uint256 id);

    event SharesMinted(uint256 id, uint256 amount, address receiver);
    event SharesBurned(uint256 id, uint256 amount, address receiver);
    event WinningsClaimed(
        uint256 id,
        address winningOutcome,
        uint256 winningIndex,
        string winningName,
        uint256 amount,
        uint256 settlementFee,
        uint256 payout,
        address indexed receiver
    );

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
        OwnedERC20 winner;
        uint256 winnerIndex;
        uint256 settlementFee;
        uint256 protocolFee;
        uint256 stakerFee;
        uint256 creationTimestamp;
        uint256[] initialOdds;
        bool active; // false if not ready to use or if resolved
    }
    Market[] internal markets;

    uint256 private constant MAX_UINT = 2**256 - 1;

    constructor(
        address _owner,
        IERC20Full _collateral,
        uint256 _shareFactor,
        FeePot _feePot,
        uint256[3] memory _fees, // staker, settlement, protocol
        address _protocol
    ) {
        owner = _owner; // controls fees for new markets
        collateral = _collateral;
        shareFactor = _shareFactor;
        feePot = _feePot;
        stakerFee = _fees[0];
        settlementFee = _fees[1];
        protocolFee = _fees[2];
        protocol = _protocol;

        _collateral.approve(address(_feePot), MAX_UINT);

        // First market is always empty so that marketid zero means "no market"
        markets.push(makeEmptyMarket());
    }

    // Returns an empty struct if the market doesn't exist.
    // Can check market existence before calling this by comparing _id against markets.length.
    // Can check market existence of the return struct by checking that shareTokens[0] isn't the null address
    function getMarket(uint256 _id) public view returns (Market memory) {
        if (_id >= markets.length) {
            return makeEmptyMarket();
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
        require(markets.length > _id);
        require(markets[_id].active);

        uint256 _cost = calcCost(_shareToMint);
        collateral.transferFrom(msg.sender, address(this), _cost);

        Market memory _market = markets[_id];
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
        require(markets.length > _id);
        require(markets[_id].active);

        Market memory _market = markets[_id];
        for (uint256 _i = 0; _i < _market.shareTokens.length; _i++) {
            // errors if sender doesn't have enough shares
            _market.shareTokens[_i].trustedBurn(msg.sender, _sharesToBurn);
        }

        uint256 _payout = calcCost(_sharesToBurn);
        uint256 _protocolFee = _payout.mul(_market.protocolFee).div(10**18);
        uint256 _stakerFee = _payout.mul(_market.stakerFee).div(10**18);
        _payout = _payout.sub(_protocolFee).sub(_stakerFee);

        accumulatedProtocolFee += _protocolFee;
        collateral.transfer(_receiver, _payout);
        feePot.depositFees(_stakerFee);

        emit SharesBurned(_id, _sharesToBurn, msg.sender);
        return _payout;
    }

    function claimWinnings(uint256 _id, address _receiver) public returns (uint256) {
        require(isMarketResolved(_id), "market unresolved");

        Market memory _market = markets[_id];
        uint256 _winningShares = _market.winner.trustedBurnAll(msg.sender);
        _winningShares = (_winningShares / shareFactor) * shareFactor; // remove unusable dust

        uint256 _payout = calcCost(_winningShares); // will fail if there are no winnings to claim
        uint256 _settlementFee = _payout.mul(_market.settlementFee).div(10**18);
        _payout = _payout.sub(_settlementFee);

        accumulatedSettlementFees[_market.settlementAddress] += _settlementFee;
        collateral.transfer(_receiver, _payout);

        uint256 _winningIndex = _market.winnerIndex;
        string memory _winningName = _market.winner.name();

        emit WinningsClaimed(
            _id,
            address(_market.winner),
            _winningIndex,
            _winningName,
            _winningShares,
            _settlementFee,
            _payout,
            _receiver
        );
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
        if (_fees > 0) {
            accumulatedSettlementFees[msg.sender] = 0;
            collateral.transfer(_receiver, _fees);
        }
        return _fees;
    }

    function claimProtocolFees() public returns (uint256) {
        require(msg.sender == protocol || msg.sender == address(this));
        uint256 _fees = accumulatedProtocolFee;
        if (_fees > 0) {
            accumulatedProtocolFee = 0;
            collateral.transfer(protocol, _fees);
        }
        return _fees;
    }

    function setSettlementFee(uint256 _newFee) external onlyOwner {
        settlementFee = _newFee;
    }

    function setStakerFee(uint256 _newFee) external onlyOwner {
        stakerFee = _newFee;
    }

    function setProtocolFee(uint256 _newFee) external onlyOwner {
        protocolFee = _newFee;
    }

    function setProtocol(address _newProtocol, bool _claimFirst) external onlyOwner {
        if (_claimFirst) {
            claimProtocolFees();
        }
        protocol = _newProtocol;
    }

    function startMarket(
        address _settlementAddress,
        string[] memory _names,
        uint256[] memory _initialOdds,
        bool _active
    ) internal returns (uint256 _marketId) {
        _marketId = markets.length;
        markets.push(
            Market(
                _settlementAddress,
                createShareTokens(_names, address(this)),
                OwnedERC20(0),
                0,
                settlementFee,
                protocolFee,
                stakerFee,
                block.timestamp,
                _initialOdds,
                _active
            )
        );
        emit MarketCreated(_marketId, _names, _initialOdds);
        if (_active) {
            emit MarketActivated(_marketId);
        }
    }

    function activateMarket(uint256 _marketId) internal {
        markets[_marketId].active = true;
        emit MarketActivated(_marketId);
    }

    function makeEmptyMarket() private pure returns (Market memory) {
        OwnedERC20[] memory _tokens = new OwnedERC20[](0);
        uint256[] memory _initialOdds = new uint256[](0);
        return Market(address(0), _tokens, OwnedERC20(0), 0, 0, 0, 0, 0, _initialOdds, false);
    }

    function endMarket(uint256 _marketId, uint256 _winningOutcome) internal {
        OwnedERC20 _winner = markets[_marketId].shareTokens[_winningOutcome];
        markets[_marketId].winner = _winner;
        markets[_marketId].active = false;
        markets[_marketId].winnerIndex = _winningOutcome;
        string memory _outcomeName = _winner.name();
        emit MarketResolved(_marketId, address(_winner), _winningOutcome, _outcomeName);
    }

    function isMarketResolved(uint256 _id) public view returns (bool) {
        Market memory _market = markets[_id];
        return _market.winner != OwnedERC20(0);
    }

    // shares => collateral
    // Shares must be both greater than (or equal to) and divisible by shareFactor.
    function calcCost(uint256 _shares) public view returns (uint256) {
        require(_shares >= shareFactor && _shares % shareFactor == 0);
        return _shares / shareFactor;
    }

    // collateral => shares
    function calcShares(uint256 _collateralIn) public view returns (uint256) {
        return _collateralIn * shareFactor;
    }

    function onTransferOwnership(address, address) internal override {}
}
