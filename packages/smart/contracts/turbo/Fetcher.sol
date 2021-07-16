// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;
pragma abicoder v2;

import "../libraries/IERC20Full.sol";
import "../balancer/BPool.sol";
import "./AbstractMarketFactory.sol";
import "./FeePot.sol";
import "../libraries/SafeMathInt256.sol";
import "./MMALinkMarketFactory.sol";
import "./AMMFactory.sol";
import "./CryptoMarketFactory.sol";
import "./SportsLinkMarketFactory.sol";

// Helper contract for grabbing huge amounts of data without overloading multicall.
abstract contract Fetcher {
    using SafeMathUint256 for uint256;
    using SafeMathInt256 for int256;

    function marketType() public virtual returns (string memory);

    function version() public virtual returns (string memory);

    struct CollateralBundle {
        address addr;
        string symbol;
        uint256 decimals;
    }

    struct MarketFactoryBundle {
        uint256 shareFactor;
        uint256 stakerFee;
        uint256 settlementFee;
        uint256 protocolFee;
        FeePot feePot;
        CollateralBundle collateral;
        uint256 marketCount;
    }

    struct PoolBundle {
        address addr;
        uint256[] tokenRatios;
        uint256[] balances;
        uint256[] weights;
        uint256 swapFee;
        uint256 totalSupply;
    }

    struct StaticMarketBundle {
        AbstractMarketFactory factory;
        uint256 marketId;
        PoolBundle pool;
        OwnedERC20[] shareTokens;
        uint256 creationTimestamp;
        uint256 endTime;
        OwnedERC20 winner;
    }

    struct DynamicMarketBundle {
        AbstractMarketFactory factory;
        uint256 marketId;
        PoolBundle pool;
        OwnedERC20 winner;
    }

    function buildCollateralBundle(IERC20Full _collateral) internal view returns (CollateralBundle memory _bundle) {
        _bundle.addr = address(_collateral);
        _bundle.symbol = _collateral.symbol();
        _bundle.decimals = _collateral.decimals();
    }

    function buildMarketFactoryBundle(AbstractMarketFactory _marketFactory)
        internal
        view
        returns (MarketFactoryBundle memory _bundle)
    {
        _bundle.shareFactor = _marketFactory.shareFactor();
        _bundle.stakerFee = _marketFactory.stakerFee();
        _bundle.settlementFee = _marketFactory.settlementFee();
        _bundle.protocolFee = _marketFactory.protocolFee();
        _bundle.feePot = _marketFactory.feePot();
        _bundle.collateral = buildCollateralBundle(_marketFactory.collateral());
        _bundle.marketCount = _marketFactory.marketCount();
    }

    function buildStaticMarketBundle(
        AbstractMarketFactory _marketFactory,
        AMMFactory _ammFactory,
        uint256 _marketId
    ) internal view returns (StaticMarketBundle memory _bundle) {
        AbstractMarketFactory.Market memory _market = _marketFactory.getMarket(_marketId);
        _bundle.factory = _marketFactory;
        _bundle.marketId = _marketId;
        _bundle.shareTokens = _market.shareTokens;
        _bundle.creationTimestamp = _market.creationTimestamp;
        _bundle.endTime = _market.endTime;
        _bundle.winner = _market.winner;
        _bundle.pool = buildPoolBundle(_marketFactory, _ammFactory, _marketId);
    }

    function buildDynamicMarketBundle(
        AbstractMarketFactory _marketFactory,
        AMMFactory _ammFactory,
        uint256 _marketId
    ) internal view returns (DynamicMarketBundle memory _bundle) {
        AbstractMarketFactory.Market memory _market = _marketFactory.getMarket(_marketId);

        _bundle.factory = _marketFactory;
        _bundle.marketId = _marketId;
        _bundle.winner = _market.winner;
        _bundle.pool = buildPoolBundle(_marketFactory, _ammFactory, _marketId);
    }

    function buildPoolBundle(
        AbstractMarketFactory _marketFactory,
        AMMFactory _ammFactory,
        uint256 _marketId
    ) internal view returns (PoolBundle memory _bundle) {
        BPool _pool = _ammFactory.getPool(_marketFactory, _marketId);
        if (_pool == BPool(address(0))) return _bundle;

        _bundle.addr = address(_pool);
        _bundle.totalSupply = _pool.totalSupply();
        _bundle.swapFee = _ammFactory.getSwapFee(_marketFactory, _marketId);
        _bundle.balances = _ammFactory.getPoolBalances(_marketFactory, _marketId);
        _bundle.tokenRatios = _ammFactory.tokenRatios(_marketFactory, _marketId);
        _bundle.weights = _ammFactory.getPoolWeights(_marketFactory, _marketId);
    }

    // Starts from the end of the markets list because newer markets are more interesting.
    // _offset is skipping all markets, not just interesting markets
    function listOfInterestingMarkets(
        address _marketFactory,
        uint256 _offset,
        uint256 _total
    ) internal view returns (uint256[] memory _interestingMarketIds) {
        _interestingMarketIds = new uint256[](_total);
        uint256 _max = AbstractMarketFactory(_marketFactory).marketCount() - 1;

        // No remaining markets so return nothing. (needed to avoid integer underflow below)
        if (_offset > _max) {
            return new uint256[](0);
        }

        // Starts at the end, less offset.
        // Stops before the 0th market since that market is always fake.
        uint256 n = 0;
        for (uint256 _marketId = _max - _offset; _marketId > 0; _marketId--) {
            if (n >= _total) break;
            if (openOrHasWinningShares(AbstractMarketFactory(_marketFactory), _marketId)) {
                _interestingMarketIds[n] = _marketId;
                n++;
            }
        }

        if (_total > n) {
            assembly {
                // shortens array
                mstore(_interestingMarketIds, n)
            }
        }
    }

    function openOrHasWinningShares(AbstractMarketFactory _marketFactory, uint256 _marketId)
        internal
        view
        returns (bool)
    {
        AbstractMarketFactory.Market memory _market = _marketFactory.getMarket(_marketId);
        if (_market.winner == OwnedERC20(address(0))) return true; // open
        return _market.winner.totalSupply() > 0; // has winning shares
    }
}

contract NBAFetcher is Fetcher {
    function marketType() public pure override returns (string memory) {
        return "NBA";
    }

    function version() public pure override returns (string memory) {
        return "TBD";
    }

    struct SpecificMarketFactoryBundle {
        MarketFactoryBundle super;
        uint256 sportId;
    }

    struct SpecificStaticMarketBundle {
        StaticMarketBundle super;
        uint256 eventId;
        uint256 homeTeamId;
        uint256 awayTeamId;
        uint256 estimatedStartTime;
        SportsLinkMarketFactory.MarketType marketType;
        int256 value0;
        // Dynamics
        SportsLinkMarketFactory.EventStatus eventStatus;
    }

    struct SpecificDynamicMarketBundle {
        DynamicMarketBundle super;
        SportsLinkMarketFactory.EventStatus eventStatus;
    }

    function buildSpecificMarketFactoryBundle(address _marketFactory)
        internal
        view
        returns (SpecificMarketFactoryBundle memory _bundle)
    {
        _bundle.super = buildMarketFactoryBundle(SportsLinkMarketFactory(_marketFactory));
        _bundle.sportId = SportsLinkMarketFactory(_marketFactory).sportId();
    }

    function buildSpecificStaticMarketBundle(
        address _marketFactory,
        AMMFactory _ammFactory,
        uint256 _marketId
    ) internal view returns (SpecificStaticMarketBundle memory _bundle) {
        SportsLinkMarketFactory.MarketDetails memory _details =
            SportsLinkMarketFactory(_marketFactory).getMarketDetails(_marketId);
        _bundle.super = buildStaticMarketBundle(SportsLinkMarketFactory(_marketFactory), _ammFactory, _marketId);
        _bundle.eventId = _details.eventId;
        _bundle.homeTeamId = _details.homeTeamId;
        _bundle.awayTeamId = _details.awayTeamId;
        _bundle.estimatedStartTime = _details.estimatedStartTime;
        _bundle.marketType = _details.marketType;
        _bundle.value0 = _details.value0;
        _bundle.eventStatus = _details.eventStatus;
    }

    function buildSpecificDynamicMarketBundle(
        address _marketFactory,
        AMMFactory _ammFactory,
        uint256 _marketId
    ) internal view returns (SpecificDynamicMarketBundle memory _bundle) {
        SportsLinkMarketFactory.MarketDetails memory _details =
            SportsLinkMarketFactory(_marketFactory).getMarketDetails(_marketId);
        _bundle.super = buildDynamicMarketBundle(SportsLinkMarketFactory(_marketFactory), _ammFactory, _marketId);
        _bundle.eventStatus = _details.eventStatus;
    }

    // NOTE: Copy-paste fetchInitial and fetchDynamic for each Fetcher.
    //       Implement the buildSpecific* methods and Specific*Bundle structs.
    function fetchInitial(
        address _marketFactory,
        AMMFactory _ammFactory,
        uint256 _offset,
        uint256 _total
    )
        public
        view
        returns (
            SpecificMarketFactoryBundle memory _marketFactoryBundle,
            SpecificStaticMarketBundle[] memory _marketBundles
        )
    {
        _marketFactoryBundle = buildSpecificMarketFactoryBundle(_marketFactory);

        uint256[] memory _marketIds = listOfInterestingMarkets(_marketFactory, _offset, _total);

        _total = _marketIds.length;
        _marketBundles = new SpecificStaticMarketBundle[](_total);
        for (uint256 i; i < _total; i++) {
            _marketBundles[i] = buildSpecificStaticMarketBundle(_marketFactory, _ammFactory, _marketIds[i]);
        }
    }

    function fetchDynamic(
        address _marketFactory,
        AMMFactory _ammFactory,
        uint256 _offset,
        uint256 _total
    ) public view returns (SpecificDynamicMarketBundle[] memory _bundles) {
        uint256[] memory _marketIds = listOfInterestingMarkets(_marketFactory, _offset, _total);

        _total = _marketIds.length;
        _bundles = new SpecificDynamicMarketBundle[](_total);
        for (uint256 i; i < _total; i++) {
            _bundles[i] = buildSpecificDynamicMarketBundle(_marketFactory, _ammFactory, _marketIds[i]);
        }
    }
}

contract MMAFetcher is Fetcher {
    function marketType() public pure override returns (string memory) {
        return "MMA";
    }

    function version() public pure override returns (string memory) {
        return "TBD";
    }

    struct SpecificMarketFactoryBundle {
        MarketFactoryBundle super;
        uint256 sportId;
    }

    struct SpecificStaticMarketBundle {
        StaticMarketBundle super;
        uint256 eventId;
        string homeFighterName;
        uint256 homeFighterId;
        string awayFighterName;
        uint256 awayFighterId;
        uint256 estimatedStartTime;
        MMALinkMarketFactory.MarketType marketType;
        uint256[3] headToHeadWeights; // derived from moneyline
        // Dynamics
        MMALinkMarketFactory.EventStatus eventStatus;
    }

    struct SpecificDynamicMarketBundle {
        DynamicMarketBundle super;
        MMALinkMarketFactory.EventStatus eventStatus;
    }

    function buildSpecificMarketFactoryBundle(address _marketFactory)
        internal
        view
        returns (SpecificMarketFactoryBundle memory _bundle)
    {
        _bundle.super = buildMarketFactoryBundle(MMALinkMarketFactory(_marketFactory));
        _bundle.sportId = MMALinkMarketFactory(_marketFactory).sportId();
    }

    function buildSpecificStaticMarketBundle(
        address _marketFactory,
        AMMFactory _ammFactory,
        uint256 _marketId
    ) internal view returns (SpecificStaticMarketBundle memory _bundle) {
        MMALinkMarketFactory.MarketDetails memory _details =
            MMALinkMarketFactory(_marketFactory).getMarketDetails(_marketId);
        _bundle.super = buildStaticMarketBundle(MMALinkMarketFactory(_marketFactory), _ammFactory, _marketId);
        _bundle.eventId = _details.eventId;
        _bundle.homeFighterName = _details.homeFighterName;
        _bundle.homeFighterId = _details.homeFighterId;
        _bundle.awayFighterName = _details.awayFighterName;
        _bundle.awayFighterId = _details.awayFighterId;
        _bundle.estimatedStartTime = _details.estimatedStartTime;
        _bundle.marketType = _details.marketType;
        _bundle.eventStatus = _details.eventStatus;
        _bundle.headToHeadWeights = _details.headToHeadWeights;
    }

    function buildSpecificDynamicMarketBundle(
        address _marketFactory,
        AMMFactory _ammFactory,
        uint256 _marketId
    ) internal view returns (SpecificDynamicMarketBundle memory _bundle) {
        MMALinkMarketFactory.MarketDetails memory _details =
            MMALinkMarketFactory(_marketFactory).getMarketDetails(_marketId);
        _bundle.super = buildDynamicMarketBundle(MMALinkMarketFactory(_marketFactory), _ammFactory, _marketId);
        _bundle.eventStatus = _details.eventStatus;
    }

    // NOTE: Copy-paste fetchInitial and fetchDynamic for each Fetcher.
    //       Implement the buildSpecific* methods and Specific*Bundle structs.
    function fetchInitial(
        address _marketFactory,
        AMMFactory _ammFactory,
        uint256 _offset,
        uint256 _total
    )
        public
        view
        returns (
            SpecificMarketFactoryBundle memory _marketFactoryBundle,
            SpecificStaticMarketBundle[] memory _marketBundles
        )
    {
        _marketFactoryBundle = buildSpecificMarketFactoryBundle(_marketFactory);

        uint256[] memory _marketIds = listOfInterestingMarkets(_marketFactory, _offset, _total);

        _total = _marketIds.length;
        _marketBundles = new SpecificStaticMarketBundle[](_total);
        for (uint256 i; i < _total; i++) {
            _marketBundles[i] = buildSpecificStaticMarketBundle(_marketFactory, _ammFactory, _marketIds[i]);
        }
    }

    function fetchDynamic(
        address _marketFactory,
        AMMFactory _ammFactory,
        uint256 _offset,
        uint256 _total
    ) public view returns (SpecificDynamicMarketBundle[] memory _bundles) {
        uint256[] memory _marketIds = listOfInterestingMarkets(_marketFactory, _offset, _total);

        _total = _marketIds.length;
        _bundles = new SpecificDynamicMarketBundle[](_total);
        for (uint256 i; i < _total; i++) {
            _bundles[i] = buildSpecificDynamicMarketBundle(_marketFactory, _ammFactory, _marketIds[i]);
        }
    }
}

contract CryptoFetch is Fetcher {
    function marketType() public pure override returns (string memory) {
        return "Crypto";
    }

    function version() public pure override returns (string memory) {
        return "TBD";
    }

    struct SpecificMarketFactoryBundle {
        MarketFactoryBundle super;
    }

    struct SpecificStaticMarketBundle {
        StaticMarketBundle super;
        CryptoMarketFactory.MarketType marketType;
        uint256 coinIndex;
        uint256 creationPrice;
        // Dynamics
        uint256 resolutionPrice;
    }

    struct SpecificDynamicMarketBundle {
        DynamicMarketBundle super;
        uint256 resolutionPrice;
    }

    function buildSpecificMarketFactoryBundle(address _marketFactory)
        internal
        view
        returns (SpecificMarketFactoryBundle memory _bundle)
    {
        _bundle.super = buildMarketFactoryBundle(CryptoMarketFactory(_marketFactory));
    }

    function buildSpecificStaticMarketBundle(
        address _marketFactory,
        AMMFactory _ammFactory,
        uint256 _marketId
    ) internal view returns (SpecificStaticMarketBundle memory _bundle) {
        CryptoMarketFactory.MarketDetails memory _details =
            CryptoMarketFactory(_marketFactory).getMarketDetails(_marketId);
        _bundle.super = buildStaticMarketBundle(CryptoMarketFactory(_marketFactory), _ammFactory, _marketId);
        _bundle.marketType = _details.marketType;
        _bundle.creationPrice = _details.creationPrice;
        _bundle.coinIndex = _details.coinIndex;
        _bundle.resolutionPrice = _details.resolutionPrice;
    }

    function buildSpecificDynamicMarketBundle(
        address _marketFactory,
        AMMFactory _ammFactory,
        uint256 _marketId
    ) internal view returns (SpecificDynamicMarketBundle memory _bundle) {
        CryptoMarketFactory.MarketDetails memory _details =
            CryptoMarketFactory(_marketFactory).getMarketDetails(_marketId);
        _bundle.super = buildDynamicMarketBundle(CryptoMarketFactory(_marketFactory), _ammFactory, _marketId);
        _bundle.resolutionPrice = _details.resolutionPrice;
    }

    // NOTE: Copy-paste fetchInitial and fetchDynamic for each Fetcher.
    //       Implement the buildSpecific* methods and Specific*Bundle structs.
    function fetchInitial(
        address _marketFactory,
        AMMFactory _ammFactory,
        uint256 _offset,
        uint256 _total
    )
        public
        view
        returns (
            SpecificMarketFactoryBundle memory _marketFactoryBundle,
            SpecificStaticMarketBundle[] memory _marketBundles
        )
    {
        _marketFactoryBundle = buildSpecificMarketFactoryBundle(_marketFactory);

        uint256[] memory _marketIds = listOfInterestingMarkets(_marketFactory, _offset, _total);

        _total = _marketIds.length;
        _marketBundles = new SpecificStaticMarketBundle[](_total);
        for (uint256 i; i < _total; i++) {
            _marketBundles[i] = buildSpecificStaticMarketBundle(_marketFactory, _ammFactory, _marketIds[i]);
        }
    }

    function fetchDynamic(
        address _marketFactory,
        AMMFactory _ammFactory,
        uint256 _offset,
        uint256 _total
    ) public view returns (SpecificDynamicMarketBundle[] memory _bundles) {
        uint256[] memory _marketIds = listOfInterestingMarkets(_marketFactory, _offset, _total);

        _total = _marketIds.length;
        _bundles = new SpecificDynamicMarketBundle[](_total);
        for (uint256 i; i < _total; i++) {
            _bundles[i] = buildSpecificDynamicMarketBundle(_marketFactory, _ammFactory, _marketIds[i]);
        }
    }
}
