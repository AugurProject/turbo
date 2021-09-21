// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;
pragma experimental ABIEncoderV2;

import "../balancer/BFactory.sol";
import "../libraries/SafeMathUint256.sol";
import "./AbstractMarketFactoryV3.sol";
import "../balancer/BNum.sol";

contract AMMFactory is BNum {
    using SafeMathUint256 for uint256;

    uint256 private constant MAX_UINT = 2**256 - 1;
    uint256 private constant MIN_INITIAL_LIQUIDITY = BONE * 100;

    BFactory public bFactory;
    // MarketFactory => Market => BPool
    mapping(address => mapping(uint256 => BPool)) public pools;
    uint256 fee;

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

    constructor(BFactory _bFactory, uint256 _fee) {
        bFactory = _bFactory;
        fee = _fee;
    }

    function createPool(
        AbstractMarketFactoryV3 _marketFactory,
        uint256 _marketId,
        uint256 _initialLiquidity,
        address _lpTokenRecipient
    ) public returns (uint256) {
        require(pools[address(_marketFactory)][_marketId] == BPool(0), "Pool already created");

        AbstractMarketFactoryV3.Market memory _market = _marketFactory.getMarket(_marketId);

        uint256 _sets = _marketFactory.calcShares(_initialLiquidity);

        // Comparing to sets because sets are normalized to 10e18.
        require(_sets >= MIN_INITIAL_LIQUIDITY, "Initial liquidity must be at least 100 collateral.");

        //  Turn collateral into shares
        IERC20Full _collateral = _marketFactory.collateral();
        require(
            _collateral.allowance(msg.sender, address(this)) >= _initialLiquidity,
            "insufficient collateral allowance for initial liquidity"
        );

        _collateral.transferFrom(msg.sender, address(this), _initialLiquidity);
        _collateral.approve(address(_marketFactory), MAX_UINT);

        _marketFactory.mintShares(_marketId, _sets, address(this));

        // Create pool
        BPool _pool = bFactory.newBPool();

        // Add each outcome to the pool. Collateral is NOT added.
        for (uint256 i = 0; i < _market.shareTokens.length; i++) {
            OwnedERC20 _token = _market.shareTokens[i];
            _token.approve(address(_pool), MAX_UINT);
            _pool.bind(address(_token), _sets, _market.initialOdds[i]);
        }

        // Set the swap fee.
        _pool.setSwapFee(fee);

        // Finalize pool setup
        _pool.finalize();

        pools[address(_marketFactory)][_marketId] = _pool;

        // Pass along LP tokens for initial liquidity
        uint256 _lpTokenBalance = _pool.balanceOf(address(this)) - (BONE / 1000);

        // Burn (BONE / 1000) lp tokens to prevent the bpool from locking up. When all liquidity is removed.
        _pool.transfer(address(0x0), (BONE / 1000));
        _pool.transfer(_lpTokenRecipient, _lpTokenBalance);

        uint256[] memory _balances = new uint256[](_market.shareTokens.length);
        for (uint256 i = 0; i < _market.shareTokens.length; i++) {
            _balances[i] = 0;
        }

        emit PoolCreated(address(_pool), address(_marketFactory), _marketId, msg.sender, _lpTokenRecipient);
        emit LiquidityChanged(
            address(_marketFactory),
            _marketId,
            msg.sender,
            _lpTokenRecipient,
            -int256(_initialLiquidity),
            int256(_lpTokenBalance),
            _balances
        );

        return _lpTokenBalance;
    }

    function addLiquidity(
        AbstractMarketFactoryV3 _marketFactory,
        uint256 _marketId,
        uint256 _collateralIn,
        uint256 _minLPTokensOut,
        address _lpTokenRecipient
    ) public returns (uint256 _poolAmountOut, uint256[] memory _balances) {
        BPool _pool = pools[address(_marketFactory)][_marketId];
        require(_pool != BPool(0), "Pool needs to be created");

        AbstractMarketFactoryV3.Market memory _market = _marketFactory.getMarket(_marketId);

        //  Turn collateral into shares
        IERC20Full _collateral = _marketFactory.collateral();
        _collateral.transferFrom(msg.sender, address(this), _collateralIn);
        _collateral.approve(address(_marketFactory), MAX_UINT);
        uint256 _sets = _marketFactory.calcShares(_collateralIn);
        _marketFactory.mintShares(_marketId, _sets, address(this));

        // Find poolAmountOut
        _poolAmountOut = MAX_UINT;

        {
            uint256 _totalSupply = _pool.totalSupply();
            uint256[] memory _maxAmountsIn = new uint256[](_market.shareTokens.length);
            for (uint256 i = 0; i < _market.shareTokens.length; i++) {
                _maxAmountsIn[i] = _sets;

                OwnedERC20 _token = _market.shareTokens[i];
                uint256 _bPoolTokenBalance = _pool.getBalance(address(_token));

                // This is the result the following when solving for poolAmountOut:
                // uint256 ratio = bdiv(poolAmountOut, poolTotal);
                // uint256 tokenAmountIn = bmul(ratio, bal);
                uint256 _tokenPoolAmountOut =
                    (((((_sets * BONE) - (BONE / 2)) * _totalSupply) / _bPoolTokenBalance) - (_totalSupply / 2)) / BONE;

                if (_tokenPoolAmountOut < _poolAmountOut) {
                    _poolAmountOut = _tokenPoolAmountOut;
                }
            }
            _pool.joinPool(_poolAmountOut, _maxAmountsIn);
        }

        require(_poolAmountOut >= _minLPTokensOut, "Would not have received enough LP tokens");

        _pool.transfer(_lpTokenRecipient, _poolAmountOut);

        // Transfer the remaining shares back to _lpTokenRecipient.
        _balances = new uint256[](_market.shareTokens.length);
        for (uint256 i = 0; i < _market.shareTokens.length; i++) {
            OwnedERC20 _token = _market.shareTokens[i];
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
        AbstractMarketFactoryV3 _marketFactory,
        uint256 _marketId,
        uint256 _lpTokensIn,
        uint256 _minCollateralOut,
        address _collateralRecipient
    ) public returns (uint256 _collateralOut, uint256[] memory _balances) {
        BPool _pool = pools[address(_marketFactory)][_marketId];
        require(_pool != BPool(0), "Pool needs to be created");

        AbstractMarketFactoryV3.Market memory _market = _marketFactory.getMarket(_marketId);

        _pool.transferFrom(msg.sender, address(this), _lpTokensIn);

        uint256[] memory exitPoolEstimate;
        {
            uint256[] memory minAmountsOut = new uint256[](_market.shareTokens.length);
            exitPoolEstimate = _pool.calcExitPool(_lpTokensIn, minAmountsOut);
            _pool.exitPool(_lpTokensIn, minAmountsOut);
        }

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
            OwnedERC20 _token = _market.shareTokens[i];
            if (_resolved && _token == _market.winner) continue; // all winning shares claimed when market is resolved
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

    function buy(
        AbstractMarketFactoryV3 _marketFactory,
        uint256 _marketId,
        uint256 _outcome,
        uint256 _collateralIn,
        uint256 _minTokensOut
    ) external returns (uint256) {
        BPool _pool = pools[address(_marketFactory)][_marketId];
        require(_pool != BPool(0), "Pool needs to be created");

        AbstractMarketFactoryV3.Market memory _market = _marketFactory.getMarket(_marketId);

        IERC20Full _collateral = _marketFactory.collateral();
        _collateral.transferFrom(msg.sender, address(this), _collateralIn);
        uint256 _sets = _marketFactory.calcShares(_collateralIn);
        _marketFactory.mintShares(_marketId, _sets, address(this));

        uint256 _totalDesiredOutcome = _sets;
        {
            OwnedERC20 _desiredToken = _market.shareTokens[_outcome];

            for (uint256 i = 0; i < _market.shareTokens.length; i++) {
                if (i == _outcome) continue;
                OwnedERC20 _token = _market.shareTokens[i];
                (uint256 _acquiredToken, ) =
                    _pool.swapExactAmountIn(address(_token), _sets, address(_desiredToken), 0, MAX_UINT);
                _totalDesiredOutcome += _acquiredToken;
            }
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
            bdiv(_sets, _totalDesiredOutcome)
        );

        return _totalDesiredOutcome;
    }

    function sellForCollateral(
        AbstractMarketFactoryV3 _marketFactory,
        uint256 _marketId,
        uint256 _outcome,
        uint256[] memory _shareTokensIn,
        uint256 _minSetsOut
    ) external returns (uint256) {
        BPool _pool = pools[address(_marketFactory)][_marketId];
        require(_pool != BPool(0), "Pool needs to be created");
        AbstractMarketFactoryV3.Market memory _market = _marketFactory.getMarket(_marketId);

        uint256 _setsOut = MAX_UINT;
        uint256 _totalUndesiredTokensIn = 0;
        for (uint256 i = 0; i < _market.shareTokens.length; i++) {
            _totalUndesiredTokensIn += _shareTokensIn[i];
        }

        {
            _market.shareTokens[_outcome].transferFrom(msg.sender, address(this), _totalUndesiredTokensIn);
            _market.shareTokens[_outcome].approve(address(_pool), MAX_UINT);

            for (uint256 i = 0; i < _market.shareTokens.length; i++) {
                if (i == _outcome) continue;
                OwnedERC20 _token = _market.shareTokens[i];
                (uint256 tokenAmountOut, ) =
                    _pool.swapExactAmountIn(
                        address(_market.shareTokens[_outcome]),
                        _shareTokensIn[i],
                        address(_token),
                        0,
                        MAX_UINT
                    );

                //Ensure tokenAmountOut is a multiple of shareFactor.
                tokenAmountOut = (tokenAmountOut / _marketFactory.shareFactor()) * _marketFactory.shareFactor();
                if (tokenAmountOut < _setsOut) _setsOut = tokenAmountOut;
            }

            require(_setsOut >= _minSetsOut, "Minimum sets not available.");
            _marketFactory.burnShares(_marketId, _setsOut, msg.sender);
        }

        // Transfer undesired token balance back.
        for (uint256 i = 0; i < _market.shareTokens.length; i++) {
            OwnedERC20 _token = _market.shareTokens[i];
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
            bdiv(_setsOut, _totalUndesiredTokensIn)
        );

        return _collateralOut;
    }

    // Returns an array of token values for the outcomes of the market, relative to the first outcome.
    // So the first outcome is 10**18 and all others are higher or lower.
    // Prices can be derived due to the fact that the total of all outcome shares equals one collateral, possibly with a scaling factor,
    function tokenRatios(AbstractMarketFactoryV3 _marketFactory, uint256 _marketId)
        external
        view
        returns (uint256[] memory)
    {
        BPool _pool = pools[address(_marketFactory)][_marketId];
        // Pool does not exist. Do not want to revert because multicall.
        if (_pool == BPool(0)) {
            return new uint256[](0);
        }

        AbstractMarketFactoryV3.Market memory _market = _marketFactory.getMarket(_marketId);
        address _basisToken = address(_market.shareTokens[0]);
        uint256[] memory _ratios = new uint256[](_market.shareTokens.length);
        _ratios[0] = 10**18;
        for (uint256 i = 1; i < _market.shareTokens.length; i++) {
            uint256 _price = _pool.getSpotPrice(_basisToken, address(_market.shareTokens[i]));
            _ratios[i] = _price;
        }
        return _ratios;
    }

    function getPoolBalances(AbstractMarketFactoryV3 _marketFactory, uint256 _marketId)
        external
        view
        returns (uint256[] memory)
    {
        BPool _pool = pools[address(_marketFactory)][_marketId];
        // Pool does not exist. Do not want to revert because multicall.
        if (_pool == BPool(0)) {
            return new uint256[](0);
        }

        address[] memory _tokens = _pool.getCurrentTokens();
        uint256[] memory _balances = new uint256[](_tokens.length);
        for (uint256 i = 0; i < _tokens.length; i++) {
            _balances[i] = _pool.getBalance(_tokens[i]);
        }
        return _balances;
    }

    function getPoolWeights(AbstractMarketFactoryV3 _marketFactory, uint256 _marketId)
        external
        view
        returns (uint256[] memory)
    {
        BPool _pool = pools[address(_marketFactory)][_marketId];
        // Pool does not exist. Do not want to revert because multicall.
        if (_pool == BPool(0)) {
            return new uint256[](0);
        }

        address[] memory _tokens = _pool.getCurrentTokens();
        uint256[] memory _weights = new uint256[](_tokens.length);
        for (uint256 i = 0; i < _tokens.length; i++) {
            _weights[i] = _pool.getDenormalizedWeight(_tokens[i]);
        }
        return _weights;
    }

    function getSwapFee(AbstractMarketFactoryV3 _marketFactory, uint256 _marketId) external view returns (uint256) {
        BPool _pool = pools[address(_marketFactory)][_marketId];
        return _pool.getSwapFee();
    }

    function getPoolTokenBalance(
        AbstractMarketFactoryV3 _marketFactory,
        uint256 _marketId,
        address _user
    ) external view returns (uint256) {
        BPool _pool = pools[address(_marketFactory)][_marketId];
        return _pool.balanceOf(_user);
    }

    function getPool(AbstractMarketFactoryV3 _marketFactory, uint256 _marketId) external view returns (BPool) {
        return pools[address(_marketFactory)][_marketId];
    }
}
