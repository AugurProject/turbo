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

    event PoolCreated(address pool, address indexed marketFactory, uint256 indexed marketId, address indexed creator);

    constructor(BFactory _bFactory) {
        bFactory = _bFactory;
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
        uint256 _sets = _initialLiquidity;
        _marketFactory.mintShares(_marketId, _sets, address(this));

        // Setup pool
        BPool _pool = bFactory.newBPool();
        for (uint256 i = 0; i < _market.shareTokens.length; i++) {
            OwnedERC20 _token = _market.shareTokens[i];
            _token.approve(address(_pool), MAX_UINT);
            _pool.bind(address(_token), _sets, _weights[i]);
        }
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
        uint256 _sets = _collateralIn;
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

        uint256 _minSetsToSell = _minCollateralOut;
        uint256 _setsToSell = MAX_UINT;
        for (uint256 i = 0; i < _market.shareTokens.length; i++) {
            OwnedERC20 _token = _market.shareTokens[i];
            uint256 _lpTokens = _lpTokensPerOutcome[i];
            uint256 _acquiredToken = _pool.exitswapPoolAmountIn(address(_token), _lpTokens, _minSetsToSell);
            if (_acquiredToken < _setsToSell) _setsToSell = _acquiredToken; // sell as many complete sets as you can
        }
        _marketFactory.burnShares(_marketId, _setsToSell, msg.sender);

        return _setsToSell;
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
        uint256 _sets = _collateralIn;
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

    function sell(
        AbstractMarketFactory _marketFactory,
        uint256 _marketId,
        uint256 _outcome,
        uint256[] calldata _swaps,
        uint256 _minCollateralOut
    ) external returns (uint256) {
        BPool _pool = pools[address(_marketFactory)][_marketId];
        require(_pool != BPool(0), "Pool needs to be created");

        AbstractMarketFactory.Market memory _market = _marketFactory.getMarket(_marketId);

        uint256 _minSetsToSell = _minCollateralOut;
        uint256 _setsToSell = MAX_UINT;
        OwnedERC20 _undesiredToken = _market.shareTokens[_outcome];
        for (uint256 i = 0; i < _market.shareTokens.length; i++) {
            if (i == _outcome) continue;
            OwnedERC20 _token = _market.shareTokens[i];
            uint256 _swap = _swaps[i];
            (uint256 _acquiredToken, ) =
                _pool.swapExactAmountIn(address(_undesiredToken), _swap, address(_token), _minSetsToSell, MAX_UINT);
            if (_acquiredToken < _setsToSell) _setsToSell = _acquiredToken; // sell as many complete sets as you can
        }
        _marketFactory.burnShares(_marketId, _setsToSell, msg.sender);

        return _setsToSell;
    }

    // Returns an array of prices (in collateral) matching each outcome.
    // The prices are out of 10**18, with some imprecision due to rounding.
    // DO NOT USE FOR PRECISE VALUES. This is purely for imprecise usecases like UIs.
    function prices(AbstractMarketFactory _marketFactory, uint256 _marketId) external view returns (uint256[] memory) {
        BPool _pool = pools[address(_marketFactory)][_marketId];
        AbstractMarketFactory.Market memory _market = _marketFactory.getMarket(_marketId);
        address _basisToken = address(_market.shareTokens[0]);
        uint256 _total = 0;
        uint256[] memory _prices = new uint256[](_market.shareTokens.length);
        _prices[0] = 10**18;
        for (uint256 i = 1; i < _market.shareTokens.length; i++) {
            uint256 _price = _pool.getSpotPrice(_basisToken, address(_market.shareTokens[i]));
            _prices[i] = _price;
            _total += _price;
        }
        _total /= 10**18;
        for (uint256 i = 0; i < _market.shareTokens.length; i++) {
            _prices[i] = _prices[i] / _total;
        }
        return _prices;
    }

    function tokenRatios(AbstractMarketFactory _marketFactory, uint256 _marketId)
        external
        view
        returns (uint256[] memory)
    {
        BPool _pool = pools[address(_marketFactory)][_marketId];
        AbstractMarketFactory.Market memory _market = _marketFactory.getMarket(_marketId);
        address _basisToken = address(_market.shareTokens[0]);
        uint256[] memory _prices = new uint256[](_market.shareTokens.length);
        _prices[0] = 10**18;
        for (uint256 i = 1; i < _market.shareTokens.length; i++) {
            uint256 _price = _pool.getSpotPrice(_basisToken, address(_market.shareTokens[i]));
            _prices[i] = _price;
        }
        return _prices;
    }

    function getPoolBalances(AbstractMarketFactory _marketFactory, uint256 _marketId)
        external
        view
        returns (uint256[] memory)
    {
        BPool _pool = pools[address(_marketFactory)][_marketId];
        address[] memory _tokens = _pool.getCurrentTokens();
        uint256[] memory _balances = new uint256[](_tokens.length);
        for (uint256 i = 0; i < _tokens.length; i++) {
            _balances[i] = _pool.getBalance(_tokens[i]);
        }
        return _balances;
    }
}
