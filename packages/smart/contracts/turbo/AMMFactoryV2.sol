// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;
pragma abicoder v2;

import "../balancer/IWeightedPoolFactory.sol";
import "./AbstractMarketFactoryV2.sol";

// Question: should create the interface/abstract contract for AMMFactory ???
contract AMMFactoryV2 {
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

    function createPool(
        AbstractMarketFactoryV2 _marketFactory,
        uint256 _marketId,
        uint256 _initialLiquidity,
        address _lpTokenRecipient
    ) public returns (uint256) {
        require(pools[address(_marketFactory)][_marketId] == IWeightedPool(0), "Pool already created");
        AbstractMarketFactoryV2.Market memory _market = _marketFactory.getMarket(_marketId);

        IERC20Full _collateral = _marketFactory.collateral();

        require(
            _collateral.allowance(msg.sender, address(this)) >= _initialLiquidity,
            "insufficient collateral allowance for initial liquidity"
        );

        uint256 _sets = _marketFactory.calcShares(_initialLiquidity);

        _collateral.transferFrom(msg.sender, address(this), _initialLiquidity);
        _collateral.approve(address(_marketFactory), MAX_UINT);

        _marketFactory.mintShares(_marketId, _sets, address(this));

        IERC20[] memory tokens = new IERC20[](_market.shareTokens.length);
        uint256[] memory weights = new uint256[](_market.shareTokens.length);

        for (uint256 i = 0; i < _market.shareTokens.length; i++) {
            weights[i] = _sets;
            tokens[i] = IERC20(_market.shareTokens[i]);
        }

        //ZERO_ADDRESS owner means fixed swap fees
        address _poolAddress = wPoolFactory.create(
            "WeightedPool", // TODO: rename it :)
            "WP",
            tokens,
            weights,
            new address[](0),
            fee,
            ZERO_ADDRESS
        );
        IWeightedPool _pool = IWeightedPool(_poolAddress);

        pools[address(_marketFactory)][_marketId] = _pool;

        uint256 _lpTokenBalance = _pool.balanceOf(address(this)) - (BONE / 1000);

        // Burn (BONE / 1000) lp tokens to prevent the bpool from locking up. When all liquidity is removed.
        _pool.transfer(address(0x0), (BONE / 1000));
        _pool.transfer(_lpTokenRecipient, _lpTokenBalance);

        emit PoolCreated(address(_pool), address(_marketFactory), _marketId, msg.sender, _lpTokenRecipient);
        emit LiquidityChanged(
            address(_marketFactory),
            _marketId,
            msg.sender,
            _lpTokenRecipient,
            -int256(_initialLiquidity),
            int256(_lpTokenBalance),
            new uint256[](_market.shareTokens.length)
        );
        return _lpTokenBalance;
    }

    function addLiquidity(
        AbstractMarketFactoryV2 _marketFactory,
        uint256 _marketId,
        uint256 _collateralIn,
        uint256 _minLPTokensOut,
        address _lpTokenRecipient
    ) public returns (uint256 _poolAmountOut, uint256[] memory _balances) {
        IWeightedPool _pool = pools[address(_marketFactory)][_marketId];
        require(_pool != IWeightedPool(0), "Pool needs to be created");

        AbstractMarketFactoryV2.Market memory _market = _marketFactory.getMarket(_marketId);

        //  Turn collateral into shares
        IERC20Full _collateral = _marketFactory.collateral();
        _collateral.transferFrom(msg.sender, address(this), _collateralIn);
        _collateral.approve(address(_marketFactory), MAX_UINT);
        uint256 _sets = _marketFactory.calcShares(_collateralIn);
        _marketFactory.mintShares(_marketId, _sets, address(this));
        _poolAmountOut = MAX_UINT;

        {
            (IERC20[] memory tokens, uint256[] memory tokenBalances, ) = _pool.getVault().getPoolTokens(_pool.getPoolId());

            uint256[] memory _maxAmountsIn = new uint256[](_market.shareTokens.length);

            IAsset[] memory assets = new IAsset[](tokens.length);

            for (uint256 i = 0; i < _maxAmountsIn.length; ++i) {
                _maxAmountsIn[i] = MAX_UINT;
                assets[i] = IAsset(address(tokens[i]));
            }
            
            
            // TODO: setup right parameters.
            IVault.JoinPoolRequest memory joinPoolRequest = IVault.JoinPoolRequest({
                assets: assets,
                maxAmountsIn: _maxAmountsIn,
                userData: "", // TODO create function do it.
                fromInternalBalance: false 
            });

            _pool.getVault().joinPool(
                _pool.getPoolId(),
                address(this), 
                _lpTokenRecipient, 
                joinPoolRequest
            ); 
        }

        // require(_poolAmountOut >= _minLPTokensOut, "Would not have received enough LP tokens");

        // _pool.transfer(_lpTokenRecipient, _poolAmountOut);

        // // Transfer the remaining shares back to _lpTokenRecipient.
        // _balances = new uint256[](_market.shareTokens.length);
        // for (uint256 i = 0; i < _market.shareTokens.length; i++) {
        //     OwnedERC20 _token = _market.shareTokens[i];
        //     _balances[i] = _token.balanceOf(address(this));
        //     if (_balances[i] > 0) {
        //         _token.transfer(_lpTokenRecipient, _balances[i]);
        //     }
        // }

        // emit LiquidityChanged(
        //     address(_marketFactory),
        //     _marketId,
        //     msg.sender,
        //     _lpTokenRecipient,
        //     -int256(_collateralIn),
        //     int256(_poolAmountOut),
        //     _balances
        // );
    }

    function removeLiquidity() public {}

    function buy() public {}

    function sellForCollateral() public {}

    function tokenRatios() public {}

    function getPoolBalances() public {}

    function getPoolWeights() public {}

    function getSwapFee() public {}

    function getPoolTokenBalance() public {}

    function getPool(AbstractMarketFactoryV2 _marketFactory, uint256 _marketId) external view returns (IWeightedPool) {
        return pools[address(_marketFactory)][_marketId];
    }
}
