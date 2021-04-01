// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;
pragma experimental ABIEncoderV2;

import "./HatcheryRegistry.sol";
import "../balancer/BFactory.sol";
import "./IArbiter.sol";
import "./ITurboHatchery.sol";

contract AMMFactory is HasTurboStruct {
    using SafeMathUint256 for uint256;

    uint256 private constant MAX_UINT = 2**256 - 1;

    BFactory public bFactory;
    // Hatchery => Turbo => BPool
    mapping(address => mapping(uint256 => BPool)) public pools;

    event PoolCreated(address _pool, address indexed _hatchery, uint256 indexed _turboId, address indexed _creator);

    constructor(BFactory _bFactory) {
        bFactory = _bFactory;
    }

    function createPool(ITurboHatchery _hatchery, uint256 _turboId, uint256 _initialLiquidity, uint256[] memory _weights, address _lpTokenRecipient) public returns (BPool) {
        require(pools[address(_hatchery)][_turboId] == BPool(0), "Pool already created");

        Turbo memory _turbo = getTurbo(_hatchery, _turboId);
        require(_weights.length == _turbo.shareTokens.length, "Must have one weight for each share token");

        //  Turn collateral into shares
        IERC20 _collateral = _hatchery.collateral();
        require(_collateral.allowance(msg.sender, address(this)) >= _initialLiquidity, "insufficient collateral allowance for initial liquidity");
        _collateral.transferFrom(msg.sender, address(this), _initialLiquidity);
        _collateral.approve(address(_hatchery), MAX_UINT);
        uint256 _sets = _initialLiquidity / _turbo.numTicks;
        _hatchery.mintCompleteSets(_turboId, _sets, address(this));

        // Setup pool
        BPool _pool = bFactory.newBPool();
        for (uint i = 0; i < _turbo.shareTokens.length; i++) {
            ITurboShareToken _token = _turbo.shareTokens[i];
            _token.approve(address(_pool), MAX_UINT);
            _pool.bind(address(_token), _sets, _weights[i]);
        }
        _pool.finalize();

        pools[address(_hatchery)][_turboId] = _pool;

        // Pass along LP tokens for initial liquidity
        uint256 _lpTokenBalance = _pool.balanceOf(address(this));
        _pool.transfer(_lpTokenRecipient, _lpTokenBalance);

        emit PoolCreated(address(_pool), address(_hatchery), _turboId, msg.sender);

        return _pool;
    }

    function addLiquidity(ITurboHatchery _hatchery, uint256 _turboId, uint256 _collateralIn, uint256 _minLPTokensOut, address _lpTokenRecipient) public returns (uint256) {
        BPool _pool = pools[address(_hatchery)][_turboId];
        require(_pool != BPool(0), "Pool needs to be created");

        Turbo memory _turbo = getTurbo(_hatchery, _turboId);

        //  Turn collateral into shares
        IERC20 _collateral = _hatchery.collateral();
        _collateral.transferFrom(msg.sender, address(this), _collateralIn);
        _collateral.approve(address(_hatchery), MAX_UINT);
        uint256 _sets = _collateralIn / _turbo.numTicks;
        _hatchery.mintCompleteSets(_turboId, _sets, address(this));

        // Add liquidity to pool
        uint256 _totalLPTokens = 0;
        for (uint i = 0; i < _turbo.shareTokens.length; i++) {
            ITurboShareToken _token = _turbo.shareTokens[i];
            uint256 __acquiredLPTokens = _pool.joinswapExternAmountIn(address(_token), _sets, 0);
            _totalLPTokens += __acquiredLPTokens;
        }

        require(_totalLPTokens >= _minLPTokensOut, "Would not have received enough LP tokens");

        _pool.transfer(_lpTokenRecipient, _totalLPTokens);

        return _totalLPTokens;
    }

    function removeLiquidity(ITurboHatchery _hatchery, uint256 _turboId, uint256[] memory _lpTokensPerOutcome, uint256 _minCollateralOut) public returns (uint256) {
        BPool _pool = pools[address(_hatchery)][_turboId];
        require(_pool != BPool(0), "Pool needs to be created");

        Turbo memory _turbo = getTurbo(_hatchery, _turboId);

        uint256 _minSetsToSell = _minCollateralOut / _turbo.numTicks;
        uint256 _setsToSell = MAX_UINT;
        for (uint i = 0; i < _turbo.shareTokens.length; i++) {
            ITurboShareToken _token = _turbo.shareTokens[i];
            uint256 _lpTokens = _lpTokensPerOutcome[i];
            uint256 _acquiredToken = _pool.exitswapPoolAmountIn(address(_token), _lpTokens, _minSetsToSell);
            if (_acquiredToken < _setsToSell) _setsToSell = _acquiredToken; // sell as many complete sets as you can
        }
        _hatchery.burnCompleteSets(_turboId, _setsToSell, msg.sender);

        return _setsToSell;
    }

    function buy(ITurboHatchery _hatchery, uint256 _turboId, uint256 _outcome, uint256 _collateralIn, uint256 _minTokensOut) external returns (uint256) {
        BPool _pool = pools[address(_hatchery)][_turboId];
        require(_pool != BPool(0), "Pool needs to be created");

        Turbo memory _turbo = getTurbo(_hatchery, _turboId);

        IERC20 _collateral = _hatchery.collateral();
        _collateral.transferFrom(msg.sender, address(this), _collateralIn);
        uint256 _sets = _collateralIn / _turbo.numTicks;
        _hatchery.mintCompleteSets(_turboId, _sets, address(this));

        ITurboShareToken _desiredToken = _turbo.shareTokens[_outcome];
        uint256 _totalDesiredOutcome = _sets;
        for (uint i = 0; i < _turbo.shareTokens.length; i++) {
            if (i == _outcome) continue;
            ITurboShareToken _token = _turbo.shareTokens[i];
            (uint256 _acquiredToken,) = _pool.swapExactAmountIn(address(_token), _sets, address(_desiredToken), 0, MAX_UINT);
            _totalDesiredOutcome += _acquiredToken;
        }
        require(_totalDesiredOutcome >= _minTokensOut, "Slippage exceeded");

        _desiredToken.transfer(msg.sender, _totalDesiredOutcome);

        return _totalDesiredOutcome;
    }

    function sell(ITurboHatchery _hatchery, uint256 _turboId, uint256 _outcome, uint256[] calldata _swaps, uint256 _minCollateralOut) external returns (uint256) {
        BPool _pool = pools[address(_hatchery)][_turboId];
        require(_pool != BPool(0), "Pool needs to be created");

        Turbo memory _turbo = getTurbo(_hatchery, _turboId);

        uint256 _minSetsToSell = _minCollateralOut / _turbo.numTicks;
        uint256 _setsToSell = MAX_UINT;
        ITurboShareToken _undesiredToken = _turbo.shareTokens[_outcome];
        for (uint i = 0; i < _turbo.shareTokens.length; i++) {
            if (i == _outcome) continue;
            ITurboShareToken _token = _turbo.shareTokens[i];
            uint256 _swap = _swaps[i];
            (uint256 _acquiredToken,) = _pool.swapExactAmountIn(address(_undesiredToken), _swap, address(_token), _minSetsToSell, MAX_UINT);
            if (_acquiredToken < _setsToSell) _setsToSell = _acquiredToken; // sell as many complete sets as you can
        }
        _hatchery.burnCompleteSets(_turboId, _setsToSell, msg.sender);

        return _setsToSell;
    }

    function getTurbo(ITurboHatchery _hatchery, uint256 _turboId) private view returns (Turbo memory) {
        Turbo memory turbo = _hatchery.turbos(_turboId);
        ITurboShareToken[] memory _shareTokens = _hatchery.getShareTokens(_turboId); // solidity won't return complex types in structs
        return Turbo(turbo.creator, turbo.creatorFee, turbo.numTicks, turbo.arbiter, _shareTokens, turbo.creatorFees);
    }

    // Returns an array of prices (in collateral) matching each outcome.
    // The prices are out of 10**18, with some imprecision due to rounding.
    // DO NOT USE FOR PRECISE VALUES. This is purely for imprecise usecases like UIs.
    function prices(ITurboHatchery _hatchery, uint256 _turboId) external view returns (uint256[] memory) {
        BPool _pool = pools[address(_hatchery)][_turboId];
        Turbo memory _turbo = getTurbo(_hatchery, _turboId);
        address _basisToken = address(_turbo.shareTokens[0]);
        uint256 _total = 0;
        uint256[] memory _prices = new uint256[](_turbo.shareTokens.length);
        _prices[0] = 10**18;
        for (uint256 i = 1; i < _turbo.shareTokens.length; i++) {
            uint256 _price = _pool.getSpotPrice(_basisToken, address(_turbo.shareTokens[i]));
            _prices[i] = _price;
            _total += _price;
        }
        _total /= 10**18;
        for (uint256 i = 0; i < _turbo.shareTokens.length; i++) {
            _prices[i] = _prices[i] / _total;
        }
        return _prices;
    }

    function tokenRatios(ITurboHatchery _hatchery, uint256 _turboId) external view returns (uint256[] memory) {
        BPool _pool = pools[address(_hatchery)][_turboId];
        Turbo memory _turbo = getTurbo(_hatchery, _turboId);
        address _basisToken = address(_turbo.shareTokens[0]);
        uint256[] memory _prices = new uint256[](_turbo.shareTokens.length);
        _prices[0] = 10**18;
        for (uint256 i = 1; i < _turbo.shareTokens.length; i++) {
            uint256 _price = _pool.getSpotPrice(_basisToken, address(_turbo.shareTokens[i]));
            _prices[i] = _price;
        }
        return _prices;
    }
}

import "hardhat/console.sol";
