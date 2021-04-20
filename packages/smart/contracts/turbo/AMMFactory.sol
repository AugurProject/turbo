// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;
pragma experimental ABIEncoderV2;

import "../balancer/BFactory.sol";
import "../libraries/SafeMathUint256.sol";
import "./AbstractMarketFactory.sol";

contract AMMFactory {
    using SafeMathUint256 for uint256;

    uint256 private constant MAX_UINT = 2**256 - 1;

    BFactory public bFactory;
    // MarketFactory => Market => BPool
    mapping(address => mapping(uint256 => BPool)) public pools;
    uint256 fee;

    event PoolCreated(address pool, address indexed marketFactory, uint256 indexed marketId, address indexed creator);

    constructor(BFactory _bFactory, uint256 _fee) {
        bFactory = _bFactory;
        fee = _fee;
    }

    function createPool(
        AbstractMarketFactory _marketFactory,
        uint256 _marketId,
        uint256 _initialLiquidity,
        uint256[] memory _weights,
        address _lpTokenRecipient
    ) public returns (BPool) {
        require(pools[address(_marketFactory)][_marketId] == BPool(0), "Pool already created");

        AbstractMarketFactory.Market memory _market = _marketFactory.getMarket(_marketId);

        require(_weights.length == _market.shareTokens.length, "Must have one weight for each share token");

        //  Turn collateral into shares
        IERC20Full _collateral = _marketFactory.collateral();
        require(
            _collateral.allowance(msg.sender, address(this)) >= _initialLiquidity,
            "insufficient collateral allowance for initial liquidity"
        );
        _collateral.transferFrom(msg.sender, address(this), _initialLiquidity);
        _collateral.approve(address(_marketFactory), MAX_UINT);
        uint256 _sets = _marketFactory.calcShares(_initialLiquidity);
        _marketFactory.mintShares(_marketId, _sets, address(this));

        // Create pool
        BPool _pool = bFactory.newBPool();

        // Add each outcome to the pool. Collateral is NOT added.
        for (uint256 i = 0; i < _market.shareTokens.length; i++) {
            OwnedERC20 _token = _market.shareTokens[i];
            _token.approve(address(_pool), MAX_UINT);
            _pool.bind(address(_token), _sets, _weights[i]);
        }

        // Set the swap fee.
        _pool.setSwapFee(fee);

        // Finalize pool setup
        _pool.finalize();

        pools[address(_marketFactory)][_marketId] = _pool;

        // Pass along LP tokens for initial liquidity
        uint256 _lpTokenBalance = _pool.balanceOf(address(this));
        _pool.transfer(_lpTokenRecipient, _lpTokenBalance);

        emit PoolCreated(address(_pool), address(_marketFactory), _marketId, msg.sender);

        return _pool;
    }

    function addLiquidity(
        AbstractMarketFactory _marketFactory,
        uint256 _marketId,
        uint256 _collateralIn,
        uint256 _minLPTokensOut,
        address _lpTokenRecipient
    ) public returns (uint256) {
        BPool _pool = pools[address(_marketFactory)][_marketId];
        require(_pool != BPool(0), "Pool needs to be created");

        AbstractMarketFactory.Market memory _market = _marketFactory.getMarket(_marketId);

        //  Turn collateral into shares
        IERC20Full _collateral = _marketFactory.collateral();
        _collateral.transferFrom(msg.sender, address(this), _collateralIn);
        _collateral.approve(address(_marketFactory), MAX_UINT);
        uint256 _sets = _marketFactory.calcShares(_collateralIn);
        _marketFactory.mintShares(_marketId, _sets, address(this));

        // Add liquidity to pool
        uint256 _totalLPTokens = 0;
        for (uint256 i = 0; i < _market.shareTokens.length; i++) {
            OwnedERC20 _token = _market.shareTokens[i];
            uint256 __acquiredLPTokens = _pool.joinswapExternAmountIn(address(_token), _sets, 0);
            _totalLPTokens += __acquiredLPTokens;
        }

        require(_totalLPTokens >= _minLPTokensOut, "Would not have received enough LP tokens");

        _pool.transfer(_lpTokenRecipient, _totalLPTokens);

        return _totalLPTokens;
    }

    function removeLiquidity(
        AbstractMarketFactory _marketFactory,
        uint256 _marketId,
        uint256[] memory _lpTokensPerOutcome,
        uint256 _minCollateralOut
    ) public returns (uint256) {
        BPool _pool = pools[address(_marketFactory)][_marketId];
        require(_pool != BPool(0), "Pool needs to be created");

        AbstractMarketFactory.Market memory _market = _marketFactory.getMarket(_marketId);

        uint256 _minSetsToSell = _marketFactory.calcShares(_minCollateralOut);
        uint256 _setsToSell = MAX_UINT;
        for (uint256 i = 0; i < _market.shareTokens.length; i++) {
            OwnedERC20 _token = _market.shareTokens[i];
            uint256 _lpTokens = _lpTokensPerOutcome[i];
            uint256 _acquiredToken = _pool.exitswapPoolAmountIn(address(_token), _lpTokens, _minSetsToSell);
            if (_acquiredToken < _setsToSell) _setsToSell = _acquiredToken; // sell as many complete sets as you can
        }

        // returns actual collateral out
        return _marketFactory.burnShares(_marketId, _setsToSell, msg.sender);
    }

    function buy(
        AbstractMarketFactory _marketFactory,
        uint256 _marketId,
        uint256 _outcome,
        uint256 _collateralIn,
        uint256 _minTokensOut
    ) external returns (uint256) {
        BPool _pool = pools[address(_marketFactory)][_marketId];
        require(_pool != BPool(0), "Pool needs to be created");

        AbstractMarketFactory.Market memory _market = _marketFactory.getMarket(_marketId);

        IERC20Full _collateral = _marketFactory.collateral();
        _collateral.transferFrom(msg.sender, address(this), _collateralIn);
        uint256 _sets = _marketFactory.calcShares(_collateralIn);
        _marketFactory.mintShares(_marketId, _sets, address(this));

        OwnedERC20 _desiredToken = _market.shareTokens[_outcome];
        uint256 _totalDesiredOutcome = _sets;
        for (uint256 i = 0; i < _market.shareTokens.length; i++) {
            if (i == _outcome) continue;
            OwnedERC20 _token = _market.shareTokens[i];
            (uint256 _acquiredToken, ) =
                _pool.swapExactAmountIn(address(_token), _sets, address(_desiredToken), 0, MAX_UINT);
            _totalDesiredOutcome += _acquiredToken;
        }
        require(_totalDesiredOutcome >= _minTokensOut, "Slippage exceeded");

        _desiredToken.transfer(msg.sender, _totalDesiredOutcome);

        return _totalDesiredOutcome;
    }

    function sellForCollateral(
        AbstractMarketFactory _marketFactory,
        uint256 _marketId,
        uint256 _outcome,
        uint256 _shareTokensIn,
        uint256 _setsOut
    ) external returns (uint256) {
        BPool _pool = pools[address(_marketFactory)][_marketId];
        require(_pool != BPool(0), "Pool needs to be created");

        AbstractMarketFactory.Market memory _market = _marketFactory.getMarket(_marketId);

        OwnedERC20 _undesiredToken = _market.shareTokens[_outcome];
        _undesiredToken.transferFrom(msg.sender, address(this), _shareTokensIn);
        _undesiredToken.approve(address(_pool), MAX_UINT);

        uint256 _undesiredTokenOut = _setsOut;
        for (uint256 i = 0; i < _market.shareTokens.length; i++) {
            if (i == _outcome) continue;
            OwnedERC20 _token = _market.shareTokens[i];
            (uint256 tokenAmountIn, ) =
                _pool.swapExactAmountOut(address(_undesiredToken), MAX_UINT, address(_token), _setsOut, MAX_UINT);
            _undesiredTokenOut += tokenAmountIn;
        }

        _marketFactory.burnShares(_marketId, _setsOut, msg.sender);

        // Transfer undesired token balance back.
        _undesiredToken.transfer(msg.sender, _shareTokensIn - _undesiredTokenOut);

        return _setsOut;
    }

    // Returns an array of token values for the outcomes of the market, relative to the first outcome.
    // So the first outcome is 10**18 and all others are higher or lower.
    // Prices can be derived due to the fact that the total of all outcome shares equals one collateral, possibly with a scaling factor,
    function tokenRatios(AbstractMarketFactory _marketFactory, uint256 _marketId)
        external
        view
        returns (uint256[] memory)
    {
        BPool _pool = pools[address(_marketFactory)][_marketId];
        // Pool does not exist. Do not want to revert because multicall.
        if (_pool == BPool(0)) {
            return new uint256[](0);
        }

        AbstractMarketFactory.Market memory _market = _marketFactory.getMarket(_marketId);
        address _basisToken = address(_market.shareTokens[0]);
        uint256[] memory _ratios = new uint256[](_market.shareTokens.length);
        _ratios[0] = 10**18;
        for (uint256 i = 1; i < _market.shareTokens.length; i++) {
            uint256 _price = _pool.getSpotPrice(_basisToken, address(_market.shareTokens[i]));
            _ratios[i] = _price;
        }
        return _ratios;
    }

    function getPoolBalances(AbstractMarketFactory _marketFactory, uint256 _marketId)
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

    function getPoolWeights(AbstractMarketFactory _marketFactory, uint256 _marketId)
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
            _weights[i] = _pool.getBalance(_tokens[i]);
        }
        return _weights;
    }

    function getSwapFee(AbstractMarketFactory _marketFactory, uint256 _marketId) external view returns (uint256) {
        BPool _pool = pools[address(_marketFactory)][_marketId];
        return _pool.getSwapFee();
    }
}
