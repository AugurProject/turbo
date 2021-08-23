// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;
pragma abicoder v2;

import "../balancer/v2-adapter/IWeightedPoolFactory.sol";
import "./interfaces/IMarketFactory.sol";
import "../balancer/v2-adapter/PoolManager.sol";

// Question: should create the interface/abstract contract for AMMFactory ???
contract AMMFactoryV2 is WeightedMath, PoolManager {
    event PoolCreated(
        address pool,
        address indexed marketFactory,
        uint256 indexed marketId,
        address indexed creator,
        address lpTokenRecipient
    );
    event LiquidityChanged(
        address indexed marketFactory,
        uint256 indexed marketId,
        address indexed user,
        address recipient,
        // from the perspective of the user. e.g. collateral is negative when adding liquidity
        int256 collateral,
        int256 lpTokens,
        uint256[] sharesReturned
    );

    event SharesSwapped(
        address indexed marketFactory,
        uint256 indexed marketId,
        address indexed user,
        uint256 outcome,
        // from the perspective of the user. e.g. collateral is negative when buying
        int256 collateral,
        int256 shares,
        uint256 price
    );

    IWeightedPoolFactory public wPoolFactory;

    mapping(address => mapping(uint256 => IWeightedPool)) public pools;

    constructor(address _wPoolFactory, uint256 _fee) PoolManager(_wPoolFactory, _fee) {
        wPoolFactory = IWeightedPoolFactory(_wPoolFactory);
    }

    /**
     * @dev pre process collateral
     */
    function preProcessCollateral(
        IMarketFactory _marketFactory,
        uint256 _marketId,
        uint256 _collateralValue
    ) private returns (uint256) {
        IERC20 _collateral = IERC20(_marketFactory.collateral());

        require(
            _collateral.allowance(msg.sender, address(this)) >= _collateralValue,
            "insufficient collateral allowance"
        );

        uint256 _sets = _marketFactory.calcShares(_collateralValue);

        _collateral.transferFrom(msg.sender, address(this), _collateralValue);
        _collateral.approve(address(_marketFactory), MAX_UINT);

        _marketFactory.mintShares(_marketId, _sets, address(this));

        return _sets;
    }

    function createPool(
        IMarketFactory _marketFactory,
        uint256 _marketId,
        uint256 _initialLiquidity,
        address _lpTokenRecipient
    ) public returns (uint256) {
        require(pools[address(_marketFactory)][_marketId] == IWeightedPool(0), "Pool already created");
        IMarketFactory.Market memory _market = _marketFactory.getMarket(_marketId);

        uint256 _sets = preProcessCollateral(_marketFactory, _marketId, _initialLiquidity);

        // inital parameters for pool
        (IERC20[] memory tokens, uint256[] memory weights, uint256[] memory initBalances) = _formatParameter(
            _market.shareTokens,
            _market.initialOdds,
            _sets
        );

        address _poolAddress = _createPool(tokens, weights);
        IWeightedPool _pool = IWeightedPool(_poolAddress);

        _joinPool(_pool.getPoolId(), JoinKind.INIT, _lpTokenRecipient, tokens, initBalances);

        pools[address(_marketFactory)][_marketId] = _pool;

        uint256 _lpTokenBalance = _pool.balanceOf(_lpTokenRecipient);

        emit PoolCreated(address(_pool), address(_marketFactory), _marketId, msg.sender, _lpTokenRecipient);

        emit LiquidityChanged(
            address(_marketFactory),
            _marketId,
            msg.sender,
            _lpTokenRecipient,
            -int256(_initialLiquidity),
            int256(_lpTokenBalance),
            new uint256[](_market.shareTokens.length) // balances is zeros
        );

        return _lpTokenBalance;
    }

    function addLiquidity(
        IMarketFactory _marketFactory,
        uint256 _marketId,
        uint256 _collateralIn,
        uint256 _minLPTokensOut,
        address _lpTokenRecipient
    ) public returns (uint256 _poolAmountOut, uint256[] memory _balances) {
        IWeightedPool _pool = pools[address(_marketFactory)][_marketId];
        require(_pool != IWeightedPool(0), "Pool needs to be created");

        IMarketFactory.Market memory _market = _marketFactory.getMarket(_marketId);

        uint256 _sets = preProcessCollateral(_marketFactory, _marketId, _collateralIn);

        bytes32 poolId = _pool.getPoolId();

        (IERC20[] memory tokens, , ) = vault.getPoolTokens(poolId);

        uint256[] memory joinBalances = new uint256[](tokens.length);

        for (uint256 i = 0; i < joinBalances.length; ++i) {
            joinBalances[i] = _sets;
        }

        //join pool
        _joinPool(poolId, JoinKind.EXACT_TOKENS_IN_FOR_BPT_OUT, _lpTokenRecipient, tokens, joinBalances);

        require(_poolAmountOut >= _minLPTokensOut, "Would not have received enough LP tokens");

        // Transfer the remaining shares back to _lpTokenRecipient.
        _balances = new uint256[](_market.shareTokens.length);
        for (uint256 i = 0; i < _market.shareTokens.length; i++) {
            IERC20 _token = IERC20(_market.shareTokens[i]);
            _balances[i] = _token.balanceOf(address(this));
            if (_balances[i] > 0) {
                _token.transfer(_lpTokenRecipient, _balances[i]);
            }
        }

        emit LiquidityChanged(
            address(_marketFactory),
            _marketId,
            msg.sender,
            _lpTokenRecipient,
            -int256(_collateralIn),
            int256(_poolAmountOut),
            _balances
        );
    }

    function removeLiquidity(
        IMarketFactory _marketFactory,
        uint256 _marketId,
        uint256 _lpTokenIn,
        uint256 _minCollateralOut,
        address _collateralRecipient
    ) public returns (uint256 _collateralOut, uint256[] memory _balances) {
        IWeightedPool _pool = pools[address(_marketFactory)][_marketId];
        require(_pool != IWeightedPool(0), "Pool needs to be created");

        IMarketFactory.Market memory _market = _marketFactory.getMarket(_marketId);
        _pool.transferFrom(msg.sender, address(this), _lpTokenIn);
        uint256 _setsToSell = MAX_UINT;

        {
            bytes32 _poolId = _pool.getPoolId();
            (IERC20[] memory tokens, uint256[] memory tokenBalances, ) = vault.getPoolTokens(_poolId);
            uint256[] memory tokensOut = _calcTokensOutGivenExactBptIn(tokenBalances, _lpTokenIn, _pool.totalSupply());

            _exitPool(_poolId, address(this), _lpTokenIn, _pool.totalSupply());

            // Find the number of sets to sell.
            for (uint256 i = 0; i < _market.shareTokens.length; i++) {
                uint256 _acquiredTokenBalance = tokensOut[i];
                if (_acquiredTokenBalance < _setsToSell) _setsToSell = _acquiredTokenBalance;
            }
        }

        // Must be a multiple of share factor.
        _setsToSell = (_setsToSell / _marketFactory.shareFactor()) * _marketFactory.shareFactor();

        bool _resolved = _marketFactory.isMarketResolved(_marketId);
        if (_resolved) {
            _collateralOut = _marketFactory.claimWinnings(_marketId, _collateralRecipient);
        } else {
            _collateralOut = _marketFactory.burnShares(_marketId, _setsToSell, _collateralRecipient);
        }

        require(_collateralOut > _minCollateralOut, "Amount of collateral returned too low.");
        // Transfer the remaining shares back to _collateralRecipient.
        _balances = new uint256[](_market.shareTokens.length);
        for (uint256 i = 0; i < _market.shareTokens.length; i++) {
            IERC20 _token = IERC20(_market.shareTokens[i]);
            if (_resolved && address(_token) == _market.winner) continue; // all winning shares claimed when market is resolved
            _balances[i] = _token.balanceOf(address(this));
            if (_balances[i] > 0) {
                _token.transfer(_collateralRecipient, _balances[i]);
            }
        }

        emit LiquidityChanged(
            address(_marketFactory),
            _marketId,
            msg.sender,
            _collateralRecipient,
            int256(_collateralOut),
            -int256(_lpTokenIn),
            _balances
        );
    }

    function buy(
        IMarketFactory _marketFactory,
        uint256 _marketId,
        uint256 _outcome,
        uint256 _collateralIn,
        uint256 _minTokensOut
    ) external returns (uint256) {
        IWeightedPool _pool = pools[address(_marketFactory)][_marketId];
        require(_pool != IWeightedPool(0), "Pool needs to be created");

        IMarketFactory.Market memory _market = _marketFactory.getMarket(_marketId);

        uint256 _sets = preProcessCollateral(_marketFactory, _marketId, _collateralIn);
        uint256 _totalDesiredOutcome = _sets;
        {
            IERC20 _desiredToken = IERC20(_market.shareTokens[_outcome]);
            uint256[] memory amountsIn = new uint256[](_market.shareTokens.length);

            for (uint256 i = 0; i < amountsIn.length; ++i) {
                amountsIn[i] = _sets;
            }

            int256[] memory delta = _tradeToken(
                TradeKind.BUY,
                _pool.getPoolId(),
                _market.shareTokens,
                _outcome,
                amountsIn
            );

            _totalDesiredOutcome += uint256(-delta[_outcome]);

            require(_totalDesiredOutcome >= _minTokensOut, "Slippage exceeded");

            _desiredToken.transfer(msg.sender, _totalDesiredOutcome);
        }

        emit SharesSwapped(
            address(_marketFactory),
            _marketId,
            msg.sender,
            _outcome,
            -int256(_collateralIn),
            int256(_totalDesiredOutcome),
            Math.divDown(_sets, _totalDesiredOutcome)
        );

        return _totalDesiredOutcome;
    }

    function sellForCollateral(
        IMarketFactory _marketFactory,
        uint256 _marketId,
        uint256 _outcome,
        uint256[] memory _shareTokensIn,
        uint256 _minSetsOut
    ) external returns (uint256) {
        IWeightedPool _pool = pools[address(_marketFactory)][_marketId];
        require(_pool != IWeightedPool(0), "Pool needs to be created");
        IMarketFactory.Market memory _market = _marketFactory.getMarket(_marketId);

        uint256 _setsOut = MAX_UINT;
        uint256 _totalUndesiredTokensIn = 0;
        for (uint256 i = 0; i < _market.shareTokens.length; i++) {
            _totalUndesiredTokensIn += _shareTokensIn[i];
        }

        IERC20(_market.shareTokens[_outcome]).transferFrom(msg.sender, address(this), _totalUndesiredTokensIn);

        int256[] memory delta = _tradeToken(
            TradeKind.SELL,
            _pool.getPoolId(),
            _market.shareTokens,
            _outcome,
            _shareTokensIn
        );

        for (uint256 i = 0; i < delta.length; ++i) {
            if (i != _outcome && _setsOut > uint256(-delta[i])) _setsOut = uint256(-delta[i]);
        }

        _setsOut = (_setsOut / _marketFactory.shareFactor()) * _marketFactory.shareFactor();

        require(_setsOut >= _minSetsOut, "Minimum sets not available.");
        _marketFactory.burnShares(_marketId, _setsOut, msg.sender);

        for (uint256 i = 0; i < _market.shareTokens.length; i++) {
            IERC20 _token = IERC20(_market.shareTokens[i]);
            uint256 _balance = _token.balanceOf(address(this));
            if (_balance > 0) {
                _token.transfer(msg.sender, _balance);
            }
        }

        uint256 _collateralOut = _marketFactory.calcCost(_setsOut);
        emit SharesSwapped(
            address(_marketFactory),
            _marketId,
            msg.sender,
            _outcome,
            int256(_collateralOut),
            -int256(_totalUndesiredTokensIn),
            Math.divDown(_setsOut, _totalUndesiredTokensIn)
        );

        return _collateralOut;
    }


    function tokenRatios(IMarketFactory _marketFactory, uint256 _marketId) external view returns (uint256[] memory) {
        IWeightedPool _pool = pools[address(_marketFactory)][_marketId];
        // Pool does not exist. Do not want to revert because multicall.
        if (_pool == IWeightedPool(0)) {
            return new uint256[](0);
        }

        IMarketFactory.Market memory _market = _marketFactory.getMarket(_marketId);
        (, uint256[] memory _tokenBalances, ) = _pool.getVault().getPoolTokens(_pool.getPoolId());
        uint256[] memory _weights = _pool.getNormalizedWeights();
        uint256 _fee = _pool.getSwapFeePercentage();
        uint256[] memory _ratios = new uint256[](_market.shareTokens.length);
        _ratios[0] = 10**18;

        for (uint256 i = 1; i < _market.shareTokens.length; i++) {
            uint256 _price = _calcSpotPrice(_tokenBalances[0], _weights[0], _tokenBalances[i], _weights[i], _fee);
            _ratios[i] = _price;
        }
        return _ratios;
    }

    function getPoolBalances(IMarketFactory _marketFactory, uint256 _marketId)
        external
        view
        returns (uint256[] memory)
    {
        IWeightedPool _pool = pools[address(_marketFactory)][_marketId];
        (, uint256[] memory tokenBalances, ) = _pool.getVault().getPoolTokens(_pool.getPoolId());
        return tokenBalances;
    }

    function getPoolWeights(IMarketFactory _marketFactory, uint256 _marketId) external view returns (uint256[] memory) {
        IWeightedPool _pool = pools[address(_marketFactory)][_marketId];
        return _pool.getNormalizedWeights();
    }

    function getSwapFee(IMarketFactory _marketFactory, uint256 _marketId) external view returns (uint256) {
        IWeightedPool _pool = pools[address(_marketFactory)][_marketId];
        return _pool.getSwapFeePercentage();
    }

    function getPoolTokenBalance(
        IMarketFactory _marketFactory,
        uint256 _marketId,
        address whom
    ) external view returns (uint256) {
        IWeightedPool _pool = pools[address(_marketFactory)][_marketId];
        return _pool.balanceOf(whom);
    }

    function getPool(IMarketFactory _marketFactory, uint256 _marketId) external view returns (IWeightedPool) {
        return pools[address(_marketFactory)][_marketId];
    }

    function getVault() internal view returns (IVault) {
        return wPoolFactory.getVault();
    }
}
