// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;
pragma abicoder v2;

import "../balancer/IWeightedPoolFactory.sol";
import "./interfaces/IMarketFactory.sol";

// import "@balancer-labs/v2-pool-weighted/contracts/WeightedMath.sol";

// Question: should create the interface/abstract contract for AMMFactory ???
contract AMMFactoryV2 is WeightedMath {
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
    // JoinKind from WeightedPool
    enum JoinKind {
        INIT,
        EXACT_TOKENS_IN_FOR_BPT_OUT,
        TOKEN_IN_FOR_EXACT_BPT_OUT
    }

    enum ExitKind {
        EXACT_BPT_IN_FOR_ONE_TOKEN_OUT,
        EXACT_BPT_IN_FOR_TOKENS_OUT,
        BPT_IN_FOR_EXACT_TOKENS_OUT
    }
    // find better to process with BONE
    uint256 public constant BONE = 10**18;
    address private constant ZERO_ADDRESS = address(0);
    uint256 private constant MAX_UINT = 2**256 - 1;

    IWeightedPoolFactory public wPoolFactory;
    uint256 internal fee;

    mapping(address => mapping(uint256 => IWeightedPool)) public pools;

    constructor(IWeightedPoolFactory _wPoolFactory, uint256 _fee) {
        wPoolFactory = IWeightedPoolFactory(_wPoolFactory);
        fee = _fee;
    }

    function oddsToWeights(uint256[] memory odds) private pure returns (uint256[] memory weights) {
        weights = new uint256[](odds.length);
        for (uint256 i = 0; i < weights.length; ++i) {
            weights[i] = odds[i] / 50;
        }
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

    function initialPoolParameters(address[] memory _shareTokens, uint256 _sets)
        private
        pure
        returns (IERC20[] memory tokens, uint256[] memory initBalances)
    {
        uint256 shareTokenSize = _shareTokens.length;

        tokens = new IERC20[](shareTokenSize);
        initBalances = new uint256[](shareTokenSize);

        for (uint256 i = 0; i < shareTokenSize; i++) {
            initBalances[i] = _sets;
            tokens[i] = IERC20(_shareTokens[i]);
        }
    }

    function createJoinPoolRequestData(
        JoinKind joinKind,
        IERC20[] memory tokens,
        uint256[] memory initBalances,
        uint256 pbtOut
    ) private pure returns (IVault.JoinPoolRequest memory joinPoolRequest) {
        bytes memory userData;
        IAsset[] memory assets = new IAsset[](tokens.length);

        if (joinKind == JoinKind.INIT) userData = abi.encode(joinKind, initBalances);
        else if (joinKind == JoinKind.EXACT_TOKENS_IN_FOR_BPT_OUT)
            userData = abi.encode(joinKind, initBalances, uint256(0));
        else userData = abi.encode(joinKind, new uint256[](0), pbtOut);

        for (uint256 i = 0; i < tokens.length; ++i) {
            assets[i] = IAsset(address(tokens[i]));
        }

        joinPoolRequest = IVault.JoinPoolRequest({
            assets: assets,
            maxAmountsIn: initBalances,
            userData: userData,
            fromInternalBalance: false
        });
    }

    function createExitPoolRequestData(
        ExitKind exitKind,
        IERC20[] memory tokens,
        uint256 pbtAmountIn
    ) private pure returns (IVault.ExitPoolRequest memory exitPoolRequest) {
        IAsset[] memory assets = new IAsset[](tokens.length);
        for (uint256 i = 0; i < tokens.length; ++i) {
            assets[i] = IAsset(address(tokens[i]));
        }
        exitPoolRequest = IVault.ExitPoolRequest({
            assets: assets,
            minAmountsOut: new uint256[](tokens.length),
            userData: abi.encode(ExitKind.EXACT_BPT_IN_FOR_TOKENS_OUT, pbtAmountIn),
            toInternalBalance: false
        });
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

        (IERC20[] memory tokens, uint256[] memory initBalances) = initialPoolParameters(_market.shareTokens, _sets);

        //ZERO_ADDRESS owner means fixed swap fees
        // TODO: sort tokens
        address _poolAddress = wPoolFactory.create(
            "WeightedPool", // TODO: rename it :)
            "WP",
            tokens,
            oddsToWeights(_market.initialOdds),
            fee,
            ZERO_ADDRESS
        );

        IWeightedPool _pool = IWeightedPool(_poolAddress);
        {
            IVault vault = _pool.getVault();
            // join Pool. When join balance mint _MINIMUM_BPT = 1e6 to zero address and also prevents the Pool from
            // ever being fully drained.
            vault.joinPool(
                _pool.getPoolId(),
                address(this),
                _lpTokenRecipient,
                createJoinPoolRequestData(JoinKind.INIT, tokens, initBalances, 0)
            );
        }

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

    function _calcBptOutGivenTokenIn(
        uint256 tokenIn,
        uint256 tokenBalance,
        uint256 bptTotalSupply
    ) private pure returns (uint256) {
        return (((((tokenIn * BONE) - (BONE / 2)) * bptTotalSupply) / tokenBalance) - (bptTotalSupply / 2)) / BONE;
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

        _poolAmountOut = MAX_UINT;

        {
            bytes32 poolId = _pool.getPoolId();

            (IERC20[] memory tokens, uint256[] memory tokenBalances, ) = _pool.getVault().getPoolTokens(poolId);

            IAsset[] memory assets = new IAsset[](tokens.length);
            uint256[] memory initBalances = new uint256[](tokens.length);

            for (uint256 i = 0; i < tokens.length; ++i) {
                uint256 _pbtAmountOut = _calcBptOutGivenTokenIn(_sets, tokenBalances[i], _pool.totalSupply());
                assets[i] = IAsset(address(tokens[i]));
                initBalances[i] = _sets;
                if (_poolAmountOut > _pbtAmountOut) {
                    _poolAmountOut = _pbtAmountOut;
                }
            }

            IVault.JoinPoolRequest memory joinPoolRequest = createJoinPoolRequestData(
                JoinKind.TOKEN_IN_FOR_EXACT_BPT_OUT,
                tokens,
                initBalances,
                _poolAmountOut
            );

            _pool.getVault().joinPool(poolId, address(this), _lpTokenRecipient, joinPoolRequest);
        }

        require(_poolAmountOut >= _minLPTokensOut, "Would not have received enough LP tokens");

        _pool.transfer(_lpTokenRecipient, _poolAmountOut);

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

    function exitPoolApdapter(IWeightedPool _pool, uint256 _lpTokensIn) internal returns (uint256[] memory) {
        uint256[] memory tokensOut;

        (IERC20[] memory tokens, uint256[] memory tokenBalances, ) = _pool.getVault().getPoolTokens(_pool.getPoolId());

        tokensOut = _calcTokensOutGivenExactBptIn(tokenBalances, _lpTokensIn, _pool.totalSupply());
        _pool.getVault().exitPool(
            _pool.getPoolId(),
            address(this),
            msg.sender,
            createExitPoolRequestData(ExitKind.EXACT_BPT_IN_FOR_TOKENS_OUT, tokens, _lpTokensIn)
        );
        return tokensOut;
    }

    function removeLiquidity(
        IMarketFactory _marketFactory,
        uint256 _marketId,
        uint256 _lpTokensIn,
        uint256 _minCollateralOut,
        address _collateralRecipient
    ) public returns (uint256 _collateralOut, uint256[] memory _balances) {
        IWeightedPool _pool = pools[address(_marketFactory)][_marketId];
        require(_pool != IWeightedPool(0), "Pool needs to be created");

        IMarketFactory.Market memory _market = _marketFactory.getMarket(_marketId);
        _pool.transferFrom(msg.sender, address(this), _lpTokensIn);

        uint256[] memory exitPoolEstimate = exitPoolApdapter(_pool, _lpTokensIn);

        // Find the number of sets to sell.
        uint256 _setsToSell = MAX_UINT;
        for (uint256 i = 0; i < _market.shareTokens.length; i++) {
            uint256 _acquiredTokenBalance = exitPoolEstimate[i];
            if (_acquiredTokenBalance < _setsToSell) _setsToSell = _acquiredTokenBalance;
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
            _balances[i] = exitPoolEstimate[i] - _setsToSell;
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
            -int256(_lpTokensIn),
            _balances
        );
    }

    function batchSwapBuy(
        IWeightedPool _pool,
        uint256 _outcome,
        uint256 _sets,
        address[] memory tokens
    ) private returns (uint256) {
        // create
        IVault.BatchSwapStep[] memory swapSteps = new IVault.BatchSwapStep[](tokens.length - 1);
        IAsset[] memory assets = new IAsset[](tokens.length);
        int256[] memory limits = new int256[](tokens.length);

        for (uint256 i = 0; i < tokens.length; ++i) {
            assets[i] = IAsset(tokens[i]);
            limits[i] = int256(_sets);
            if (i == _outcome) continue;
            swapSteps[i] = IVault.BatchSwapStep({
                poolId: _pool.getPoolId(),
                assetInIndex: i,
                assetOutIndex: _outcome,
                amount: _sets,
                userData: ""
            });
        }

        IVault.FundManagement memory funds = IVault.FundManagement({
            sender: address(this),
            fromInternalBalance: false,
            recipient: payable(address(this)),
            toInternalBalance: false
        });

        uint256 deadline = block.timestamp + 1 days;
        int256[] memory _acquiredTokens = _pool.getVault().batchSwap(
            IVault.SwapKind.GIVEN_IN,
            swapSteps,
            assets,
            funds,
            limits,
            deadline
        );

        uint256 _totalDesiredOutcome = uint256(_acquiredTokens[_outcome]);

        return _totalDesiredOutcome;
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
        uint256 _totalDesiredOutcome;
        {
            IERC20 _desiredToken = IERC20(_market.shareTokens[_outcome]);
            _totalDesiredOutcome = batchSwapBuy(_pool, _outcome, _sets, _market.shareTokens);

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

    function batchSwapSell(
        IWeightedPool _pool,
        uint256 _outcome,
        uint256[] memory _shareTokensIn,
        address[] memory tokens
    ) private returns (uint256) {
        _shareTokensIn[_outcome] = 0;

        IVault.BatchSwapStep[] memory swapSteps = new IVault.BatchSwapStep[](tokens.length - 1);
        IAsset[] memory assets = new IAsset[](tokens.length);
        int256[] memory limits = new int256[](tokens.length);

        for (uint256 i = 0; i < tokens.length; ++i) {
            assets[i] = IAsset(tokens[i]);
            limits[i] = int256(MAX_UINT);
            if (i == _outcome) continue;

            swapSteps[i] = IVault.BatchSwapStep({
                poolId: _pool.getPoolId(),
                assetInIndex: _outcome,
                assetOutIndex: i,
                amount: _shareTokensIn[i],
                userData: ""
            });
        }

        IVault.FundManagement memory funds = IVault.FundManagement({
            sender: address(this),
            fromInternalBalance: false,
            recipient: payable(address(this)),
            toInternalBalance: false
        });

        uint256 deadline = block.timestamp + 1 days;
        int256[] memory _acquiredTokens = _pool.getVault().batchSwap(
            IVault.SwapKind.GIVEN_IN,
            swapSteps,
            assets,
            funds,
            limits,
            deadline
        );

        uint256 _setsOut = MAX_UINT;
        for (uint256 i = 0; i < _acquiredTokens.length; ++i) {
            if (i != _outcome && _setsOut < uint256(_acquiredTokens[i])) {
                _setsOut = uint256(_acquiredTokens[i]);
            }
        }
        return _setsOut;
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
        IERC20(_market.shareTokens[_outcome]).approve(address(_pool), MAX_UINT);

        _setsOut = batchSwapSell(_pool, _outcome, _shareTokensIn, _market.shareTokens);
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

    function calcSpotPrice(
        uint256 tokenBalanceIn,
        uint256 tokenWeightIn,
        uint256 tokenBalanceOut,
        uint256 tokenWeightOut,
        uint256 swapFee
    ) internal pure returns (uint256) {
        uint256 numer = Math.divDown(tokenBalanceIn, tokenWeightIn);
        uint256 denom = Math.divDown(tokenBalanceOut, tokenWeightOut);
        uint256 ratio = Math.divDown(numer, denom);
        uint256 scale = Math.divDown(BONE, Math.sub(BONE, swapFee));
        return Math.mul(ratio, scale);
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
            uint256 _price = calcSpotPrice(_tokenBalances[0], _weights[0], _tokenBalances[i], _weights[i], _fee);
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

    function getPoolWeights(IMarketFactory _marketFactory, uint256 _marketId) external returns (uint256[] memory) {
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
}
