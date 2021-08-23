pragma solidity 0.7.6;

pragma abicoder v2;

import "./IWeightedPoolFactory.sol";
import "./TypeHelper.sol";

/**
 * @dev balancer-v2 adapter/manager. Help AMM factory can create, join, exit pool, and trades a token.
 */
contract PoolManager is WeightedMath {
    using TypeHelper for *;

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

    enum TradeKind {
        BUY,
        SELL
    }

    int256 public constant MAX_INT = 2**254;
    uint256 public constant BONE = 10**18;
    uint256 private constant limitTime = 1 days;
    address private constant ZERO_ADDRESS = address(0);
    uint256 internal constant MAX_UINT = 2**255 + 1;

    IWeightedPoolFactory public factory;

    uint256 public fee;

    IVault internal vault;

    constructor(address _factory, uint256 _fee) {
        factory = IWeightedPoolFactory(_factory);
        vault = factory.getVault();
        fee = _fee;
    }

    function createJoinRequestData(address[] memory tokens, uint256[] memory volumes) private {
        uint256 numberTokens = tokens.length;
        IAsset[] memory assets = new IAsset[](numberTokens);

        for (uint256 i = 0; i < numberTokens; ++i) {
            assets[i] = tokens[i].toAsset();
            IERC20(tokens[i]).approve(address(vault), volumes[i]);
        }
    }

    /**
     * @dev
     */
    function oddsToWeights(uint256[] memory odds) internal pure returns (uint256[] memory weights) {
        weights = new uint256[](odds.length);
        for (uint256 i = 0; i < weights.length; ++i) {
            weights[i] = odds[i] / 50;
        }
    }

    function _formatParameter(
        address[] memory _tokenAddresses,
        uint256[] memory _odds,
        uint256 _sets
    )
        internal
        pure
        returns (
            IERC20[] memory,
            uint256[] memory,
            uint256[] memory
        )
    {
        uint256 numberTokens = _tokenAddresses.length;
        uint256[] memory balances = new uint256[](numberTokens);

        // sort token addresses
        for (uint256 i = 0; i < numberTokens; ++i) {
            balances[i] = _sets;
            for (uint256 j = i + 1; j < numberTokens; ++j)
                if (_tokenAddresses[i] > _tokenAddresses[j]) {
                    (_tokenAddresses[i], _tokenAddresses[j]) = (_tokenAddresses[j], _tokenAddresses[i]);
                    (_odds[i], _odds[j]) = (_odds[j], _odds[i]);
                }
        }

        return (_tokenAddresses.toERC20s(), oddsToWeights(_odds), balances);
    }

    /**
     * @dev create new pool
     */
    function _createPool(IERC20[] memory _tokens, uint256[] memory _weights) internal returns (address) {
        address poolAddress = factory.create("Augur-Pool", "AP", _tokens, _weights, fee, ZERO_ADDRESS);
        return poolAddress;
    }

    function createJoinPoolRequestData(
        JoinKind joinKind,
        IERC20[] memory tokens,
        uint256[] memory joinBalances,
        uint256 pbtOut
    ) internal pure returns (IVault.JoinPoolRequest memory joinPoolRequest) {
        bytes memory userData;

        if (joinKind == JoinKind.INIT) userData = abi.encode(joinKind, joinBalances);

        if (joinKind == JoinKind.EXACT_TOKENS_IN_FOR_BPT_OUT) userData = abi.encode(joinKind, joinBalances, uint256(0));

        // create join request data
        joinPoolRequest.assets = tokens.toAssets();
        joinPoolRequest.maxAmountsIn = joinBalances;
        joinPoolRequest.userData = userData;
        joinPoolRequest.fromInternalBalance = false;
    }

    /**
     * @dev
     */
    function _joinPool(
        bytes32 _poolId,
        JoinKind _joinKind,
        address _recipient,
        IERC20[] memory _tokens,
        uint256[] memory _balances
    ) internal returns (uint256 amountOut) {
        IVault.JoinPoolRequest memory joinRequest = createJoinPoolRequestData(_joinKind, _tokens, _balances, 0);

        for (uint256 i = 0; i < _tokens.length; ++i) {
            _tokens[i].approve(address(vault), _balances[i]);
        }

        vault.joinPool(_poolId, address(this), _recipient, joinRequest);
    }

    function createExitPoolRequestData(address[] memory _tokens, uint256 _lpTokenIn)
        private
        pure
        returns (IVault.ExitPoolRequest memory exitPoolRequest)
    {
        //
        bytes memory userData = abi.encode(ExitKind.EXACT_BPT_IN_FOR_TOKENS_OUT, _lpTokenIn);

        // create exit pool request data
        exitPoolRequest.assets = _tokens.toAssets();
        exitPoolRequest.minAmountsOut = new uint256[](_tokens.length);
        exitPoolRequest.userData = userData;
        exitPoolRequest.toInternalBalance = false;
    }

    function _exitPool(
        bytes32 _poolId,
        address _recipient,
        uint256 _lpTokenIn,
        uint256 _lpSupply
    ) internal returns (uint256[] memory tokensOut) {
        (IERC20[] memory tokens, uint256[] memory tokenBalances, ) = vault.getPoolTokens(_poolId);

        // return tokens out given by _lpTokenIn | order by number tokens;
        tokensOut = _calcTokensOutGivenExactBptIn(tokenBalances, _lpTokenIn, _lpSupply);

        //
        IVault.ExitPoolRequest memory exitRequest = createExitPoolRequestData(tokens.toAddress(), _lpTokenIn);
        vault.exitPool(_poolId, address(this), payable(_recipient), exitRequest);
    }

    function _calcBptOutGivenTokenIn(
        uint256 tokenIn,
        uint256 tokenBalance,
        uint256 bptTotalSupply
    ) internal pure returns (uint256) {
        return (((((tokenIn * BONE) - (BONE / 2)) * bptTotalSupply) / tokenBalance) - (bptTotalSupply / 2)) / BONE;
    }

    function preProcessTrade(
        TradeKind _type,
        address[] memory _tokens,
        uint256[] memory _amountsIn,
        uint256 _outcome
    ) private {
        if (_type == TradeKind.SELL) {
            IERC20 erc20Outcome = _tokens[_outcome].toERC20();
            erc20Outcome.approve(address(vault), MAX_UINT);
        } else {
            for (uint256 i = 0; i < _tokens.length; ++i) {
                if (i != _outcome) {
                    _tokens[i].toERC20().approve(address(vault), _amountsIn[i]);
                }
            }
        }
    }

    /**
     * @dev trade token 
     */
    function _tradeToken(
        TradeKind _type,
        bytes32 _poolId,
        address[] memory _tokens,
        uint256 _outcome,
        uint256[] memory _amountsIn
    ) internal returns (int256[] memory) {
        IVault.FundManagement memory funds = IVault.FundManagement({
            sender: address(this),
            fromInternalBalance: false,
            recipient: payable(address(this)),
            toInternalBalance: false
        });

        IVault.BatchSwapStep[] memory swapSteps = new IVault.BatchSwapStep[](_tokens.length - 1);
        IAsset[] memory assets = _tokens.toAssets();
        int256[] memory limits = new int256[](_tokens.length);

        preProcessTrade(_type, _tokens, _amountsIn, _outcome);

        uint256 step = 0;
        for (uint256 i = 0; i < _tokens.length; ++i) {
            limits[i] = (_type == TradeKind.BUY) ? int256(_amountsIn[i]) : MAX_INT;

            if (i == _outcome) continue;

            // initial data for `step`-th swap

            swapSteps[step].poolId = _poolId;
            swapSteps[step].userData = "";
            swapSteps[step].amount = _amountsIn[i];

            if (_type == TradeKind.BUY) {
                swapSteps[step].assetInIndex = i;
                swapSteps[step].assetOutIndex = _outcome;
            } else {
                swapSteps[step].assetInIndex = _outcome;
                swapSteps[step].assetOutIndex = i;
            }
            ++step;
        }

        uint256 deadline = block.timestamp + limitTime;

        return vault.batchSwap(IVault.SwapKind.GIVEN_IN, swapSteps, assets, funds, limits, deadline);
    }

    function _calcSpotPrice(
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
}
