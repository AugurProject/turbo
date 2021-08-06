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

        uint256 numberToken = _market.shareTokens.length;

        IERC20[] memory tokens = new IERC20[](numberToken);

        uint256[] memory weights = new uint256[](numberToken);

        for (uint256 i = 0; i < numberToken; i++) {
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
        //TODO: check finalize setup in V2

        pools[address(_marketFactory)][_marketId] = _pool;

        emit PoolCreated(_poolAddress, address(_marketFactory), _marketId, msg.sender, _lpTokenRecipient);
    }

    function addLiquidity() public {}

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
