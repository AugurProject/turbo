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

    // JoinKind from WeightedPool
    enum JoinKind {
        INIT,
        EXACT_TOKENS_IN_FOR_BPT_OUT,
        TOKEN_IN_FOR_EXACT_BPT_OUT
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

    /**
     * @dev pre process collateral
     */
    function preProcessCollateral(
        AbstractMarketFactoryV2 _marketFactory,
        uint256 _marketId,
        uint256 _collateralValue
    ) private returns (uint256) {
        IERC20Full _collateral = _marketFactory.collateral();

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

    function initialPoolParameters(OwnedERC20[] memory _shareTokens, uint256 _sets)
        private
        returns (
            IERC20[] memory tokens,
            uint256[] memory initBalances
        )
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
        uint256[] memory initBalances
    ) private view returns (IVault.JoinPoolRequest memory joinPoolRequest) {
        bytes memory userData;
        IAsset[] memory assets = new IAsset[](tokens.length);

        if (joinKind == JoinKind.INIT) userData = abi.encode(joinKind, initBalances);
        else userData = abi.encode(joinKind, initBalances, uint256(0));

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

    function createPool(
        AbstractMarketFactoryV2 _marketFactory,
        uint256 _marketId,
        uint256 _initialLiquidity,
        address _lpTokenRecipient
    ) public returns (uint256) {
        require(pools[address(_marketFactory)][_marketId] == IWeightedPool(0), "Pool already created");
        AbstractMarketFactoryV2.Market memory _market = _marketFactory.getMarket(_marketId);

        uint256 _sets = preProcessCollateral(_marketFactory, _marketId, _initialLiquidity);

        (IERC20[] memory tokens, uint256[] memory initBalances) = initialPoolParameters(
            _market.shareTokens,
            _sets
        );

        //ZERO_ADDRESS owner means fixed swap fees
        address _poolAddress = wPoolFactory.create(
            "WeightedPool", // TODO: rename it :)
            "WP",
            tokens,
            _market.initialOdds,
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
                createJoinPoolRequestData(JoinKind.INIT, tokens, initBalances)
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

        uint256 _sets = preProcessCollateral(_marketFactory, _marketId, _collateralIn);

        _poolAmountOut = MAX_UINT;

        {
            IVault vault = _pool.getVault();
            bytes32 poolId = _pool.getPoolId();

            (IERC20[] memory tokens, uint256[] memory tokenBalances, ) = vault.getPoolTokens(poolId);

            uint256[] memory _maxAmountsIn = new uint256[](_market.shareTokens.length);

            IAsset[] memory assets = new IAsset[](tokens.length);

            for (uint256 i = 0; i < _maxAmountsIn.length; ++i) {
                _maxAmountsIn[i] = MAX_UINT;
                assets[i] = IAsset(address(tokens[i]));
            }

            // IVault.JoinPoolRequest memory joinPoolRequest = IVault.JoinPoolRequest({
            //     assets: assets,
            //     maxAmountsIn: _maxAmountsIn,
            //     userData: createJoinPoolRequestData(JoinKind.EXACT_TOKENS_IN_FOR_BPT_OUT, tokens, initBalances), // TODO create function do it.
            //     fromInternalBalance: false
            // });

            // vault.joinPool(poolId, address(this), _lpTokenRecipient, joinPoolRequest);
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
