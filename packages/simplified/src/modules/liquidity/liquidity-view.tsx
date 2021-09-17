import React, { useState, useMemo, useEffect } from "react";
import classNames from "classnames";
import Styles from "./liquidity-view.styles.less";
import {
  Components,
  Utils,
  useDataStore,
  useUserStore,
  useAppStatusStore,
  Constants,
  ContractCalls,
  Stores,
  Formatter,
  useScrollToTopOnMount,
} from "@augurproject/comps";
import { categoryItems, ZERO } from "../constants";
import { AppViewStats, AvailableLiquidityRewards } from "../common/labels";
import { BonusReward } from "../common/tables";
import { useSimplifiedStore } from "../stores/simplified";
import { MarketInfo } from "@augurproject/comps/build/types";
import BigNumber from "bignumber.js";
const { MODAL_ADD_LIQUIDITY, ADD, CREATE, REMOVE, ALL_MARKETS, OTHER, POPULAR_CATEGORIES_ICONS, SPORTS } = Constants;
const { formatToken } = Formatter;
const {
  PaginationComps: { sliceByPage, useQueryPagination, Pagination },
  Links: { MarketLink },
  SelectionComps: { SquareDropdown, ToggleSwitch },
  Icons: { Arrow, MaticIcon },
  InputComps: { SearchInput },
  LabelComps: { CategoryIcon },
  MarketCardComps: { MarketTitleArea },
  ButtonComps: { PrimaryThemeButton, SecondaryThemeButton },
} = Components;
const { canAddLiquidity, getMaticUsdPrice } = ContractCalls;
const {
  DateUtils: { getMarketEndtimeDate },
  Formatter: { formatApy, formatCash },
} = Utils;
const {
  Utils: { isMarketFinal },
} = Stores;

const PAGE_LIMIT = 50;
const MARKET_TYPE_OPTIONS = [
  {
    label: "Daily + Long Term",
    value: "daily+long",
    disabled: false,
  },
  {
    label: "Daily Only",
    value: "daily",
    disabled: false,
  },
  {
    label: "Long Term Only",
    value: "long",
    disabled: false,
  },
];

const SORT_TYPES = {
  EXPIRES: "EXPIRES",
  TVL: "TVL",
  APY: "APY",
  LIQUIDITY: "LIQUIDITY",
  REWARDS: "REWARDS",
};

const SORT_TYPE_TEXT = {
  EXPIRES: "Expires",
  TVL: "TVL",
  APY: "APY",
  LIQUIDITY: "My Liquidity",
  REWARDS: "My Rewards",
};

interface LiquidityMarketCardProps {
  key?: string;
  market: MarketInfo;
}

const applyFiltersAndSort = (
  passedInMarkets,
  setFilteredMarkets,
  transactions,
  lpTokens,
  pendingRewards,
  { filter, primaryCategory, subCategories, marketTypeFilter, sortBy, onlyUserLiquidity }
) => {
  let updatedFilteredMarkets = passedInMarkets;
  const userMarkets = Object.keys(lpTokens);
  // remove resolved markets unless we have liquidity.
  updatedFilteredMarkets = updatedFilteredMarkets.filter((market) =>
    market.hasWinner ? (userMarkets.includes(market.marketId) ? true : false) : true
  );

  if (onlyUserLiquidity) {
    updatedFilteredMarkets = updatedFilteredMarkets.filter((market) => userMarkets.includes(market.marketId));
  }

  if (marketTypeFilter !== MARKET_TYPE_OPTIONS[0].value) {
    updatedFilteredMarkets = updatedFilteredMarkets.filter((market) =>
      marketTypeFilter === MARKET_TYPE_OPTIONS[1].value ? !market.isFuture : market.isFuture
    );
  }

  if (filter !== "") {
    updatedFilteredMarkets = updatedFilteredMarkets.filter((market) => {
      const { title, description, categories, outcomes } = market;
      const searchRegex = new RegExp(filter, "i");
      const matchTitle = searchRegex.test(title);
      const matchDescription = searchRegex.test(description);
      const matchCategories = searchRegex.test(JSON.stringify(categories));
      const matchOutcomes = searchRegex.test(JSON.stringify(outcomes.map((outcome) => outcome.name)));
      if (matchTitle || matchDescription || matchCategories || matchOutcomes) {
        return true;
      }
      return false;
    });
  }

  updatedFilteredMarkets = updatedFilteredMarkets.filter((market: MarketInfo) => {
    if (
      primaryCategory !== ALL_MARKETS &&
      primaryCategory !== OTHER &&
      market.categories[0].toLowerCase() !== primaryCategory.toLowerCase()
    ) {
      return false;
    }
    if (primaryCategory === OTHER && POPULAR_CATEGORIES_ICONS[market.categories[0].toLowerCase()]) {
      return false;
    }
    if (primaryCategory === SPORTS && subCategories.length > 0) {
      // subCategories is always a max 2 length, markets are 3.
      const indexToCheck = subCategories.length === 1 ? 1 : market.categories.length - 1;
      if (
        market.categories[indexToCheck] &&
        market.categories[indexToCheck].toLowerCase() !== subCategories[indexToCheck - 1].toLowerCase()
      ) {
        return false;
      }
    }
    return true;
  });

  if (sortBy.type) {
    updatedFilteredMarkets = updatedFilteredMarkets.sort((marketA, marketB) => {
      const aTransactions = transactions ? transactions[marketA.marketId] : {};
      const bTransactions = transactions ? transactions[marketB.marketId] : {};
      const aUserLiquidity = Number(lpTokens?.[marketA.marketId]?.usdValue) || 0;
      const bUserLiquidity = Number(lpTokens?.[marketB.marketId]?.usdValue) || 0;
      const aUserRewards = Number(pendingRewards?.[marketA.marketId]?.balance) || 0;
      const bUserRewards = Number(pendingRewards?.[marketB.marketId]?.balance) || 0;

      const { type, direction } = sortBy;

      switch (type) {
        case SORT_TYPES.EXPIRES: {
          return Number(marketA.endTimestamp) < Number(marketB.endTimestamp) ? direction : direction * -1;
        }
        case SORT_TYPES.APY: {
          return (Number(bTransactions?.apy) || 0) > (Number(aTransactions?.apy) || 0) ? direction : direction * -1;
        }
        case SORT_TYPES.TVL: {
          return (bTransactions?.volumeTotalUSD || 0) > (aTransactions?.volumeTotalUSD || 0)
            ? direction
            : direction * -1;
        }
        case SORT_TYPES.LIQUIDITY: {
          return aUserLiquidity < bUserLiquidity ? direction : direction * -1;
        }
        case SORT_TYPES.REWARDS: {
          return aUserRewards < bUserRewards ? direction : direction * -1;
        }
        default:
          return 0;
      }
    });
  }

  setFilteredMarkets(updatedFilteredMarkets);
};

const LiquidityMarketCard = ({ market }: LiquidityMarketCardProps): React.FC => {
  const {
    settings: { timeFormat },
  } = useSimplifiedStore();
  const {
    actions: { setModal },
  } = useAppStatusStore();
  const {
    balances: { lpTokens, pendingRewards },
    loginAccount,
  } = useUserStore();
  const { transactions } = useDataStore();
  const {
    marketId,
    categories,
    amm: {
      hasLiquidity,
      cash: { name: currency },
      liquidityUSD,
    },
    endTimestamp,
    rewards
  } = market;
  const marketTransactions = transactions[marketId];
  const formattedApy = useMemo(() => marketTransactions?.apy && formatApy(marketTransactions.apy).full, [
    marketTransactions?.apy,
  ]);
  const formattedTVL = useMemo(
    () =>
      liquidityUSD &&
      formatCash(liquidityUSD, currency, { bigUnitPostfix: true }).full,
    [liquidityUSD]
  );
  const [price, setPrice] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const userHasLiquidity = lpTokens?.[marketId];
  const canAddLiq = canAddLiquidity(market);
  const isfinal = isMarketFinal(market);
  const pendingUserRewards = (pendingRewards || {})[market.marketId];
  const hasRewards = pendingUserRewards?.pendingBonusRewards && pendingUserRewards?.pendingBonusRewards !== "0";
  const rewardAmount = formatToken(pendingUserRewards?.balance || "0", { decimalsRounded: 2, decimals: 2 });
  useEffect(() => { let isMounted = true; getMaticUsdPrice(loginAccount?.library).then(p => { if (isMounted) setPrice(p) }); return () => isMounted = false }, []);
  const rewardsInUsd = formatCash(Number(pendingUserRewards?.balance || "0") * price).formatted;
  return (
    <article
      className={classNames(Styles.LiquidityMarketCard, {
        [Styles.HasUserLiquidity]: userHasLiquidity,
        [Styles.Expanded]: expanded,
      })}
    >
      <MarketLink id={marketId} dontGoToMarket={false}>
        <CategoryIcon {...{ categories }} />
        <MarketTitleArea {...{ ...market, timeFormat }} />
      </MarketLink>
      <button onClick={() => setExpanded(!expanded)}>
        <CategoryIcon {...{ categories }} />
        <MarketTitleArea {...{ ...market, timeFormat }} />
      </button>
      <span>{endTimestamp ? getMarketEndtimeDate(endTimestamp) : "-"}</span>
      <span>{formattedTVL || "-"}</span>
      <span>{formattedApy || "-"}</span>
      <span>{userHasLiquidity ? formatCash(userHasLiquidity?.usdValue, currency).full : "$0.00"}</span>
      <span>{rewardAmount.formatted} wMATIC</span>
      <div>
        <div className={Styles.MobileLabel}>
          <span>My Liquidity</span>
          <span>{userHasLiquidity ? formatCash(userHasLiquidity?.usdValue, currency).full : "$0.00"}</span>
          <span>init. value {formatCash(userHasLiquidity?.initCostUsd, currency).full}</span>
        </div>
        <div className={Styles.MobileLabel}>
          <span>My Rewards</span>
          <span>{rewardAmount.formatted} {MaticIcon}</span>
          <span>(${rewardsInUsd})</span>
        </div>
        {!userHasLiquidity ? (
          <PrimaryThemeButton
            text="ADD LIQUIDITY"
            small
            disabled={!canAddLiq}
            action={() =>
              setModal({
                type: MODAL_ADD_LIQUIDITY,
                market,
                liquidityModalType: hasLiquidity ? CREATE : ADD,
                currency,
              })
            }
          />
        ) : (
          <>
            <SecondaryThemeButton
              text="-"
              small
              action={() =>
                setModal({
                  type: MODAL_ADD_LIQUIDITY,
                  market,
                  currency,
                  liquidityModalType: REMOVE,
                })
              }
            />
            <PrimaryThemeButton
              text="+"
              small
              disabled={isfinal || !canAddLiq}
              action={() =>
                !isfinal &&
                setModal({
                  type: MODAL_ADD_LIQUIDITY,
                  market,
                  currency,
                  liquidityModalType: ADD,
                })
              }
            />
          </>
        )}
      </div>
      {hasRewards && <BonusReward pendingBonusRewards={pendingUserRewards?.pendingBonusRewards} rewardsInfo={rewards} />}
    </article>
  );
};

const LiquidityView = () => {
  const {
    marketsViewSettings,
    actions: { updateMarketsViewSettings },
  } = useSimplifiedStore();
  const {
    balances: { lpTokens, pendingRewards },
  } = useUserStore();
  const { markets, transactions } = useDataStore();
  const [marketTypeFilter, setMarketTypeFilter] = useState(MARKET_TYPE_OPTIONS[0].value);
  const [onlyUserLiquidity, setOnlyUserLiquidity] = useState(false);
  const [filter, setFilter] = useState("");
  const [sortBy, setSortBy] = useState({
    type: SORT_TYPES.EXPIRES,
    direction: -1,
  });
  const [filteredMarkets, setFilteredMarkets] = useState([]);
  const [page, setPage] = useQueryPagination({
    itemCount: filteredMarkets.length,
    itemsPerPage: PAGE_LIMIT,
  });
  const { primaryCategory, subCategories } = marketsViewSettings;
  const marketKeys = Object.keys(markets);
  const userMarkets = Object.keys(lpTokens);
  const rewardBalance = pendingRewards && Object.values(pendingRewards).length ? String(Object.values(pendingRewards).reduce((p: BigNumber, r: { balance: string }) => (p.plus(r.balance)), ZERO)) : "0";
  const handleFilterSort = () => {
    applyFiltersAndSort(Object.values(markets), setFilteredMarkets, transactions, lpTokens, pendingRewards, {
      filter,
      primaryCategory,
      subCategories,
      marketTypeFilter,
      sortBy,
      onlyUserLiquidity,
    });
  };

  useEffect(() => {
    handleFilterSort();
  }, [filter, primaryCategory, subCategories, marketTypeFilter, onlyUserLiquidity, sortBy.type, sortBy.direction]);

  useEffect(() => {
    handleFilterSort();
  }, [marketKeys.length, userMarkets.length]);

  useScrollToTopOnMount(page);

  return (
    <div className={Styles.LiquidityView}>
      <AppViewStats small liquidity />
      <AvailableLiquidityRewards balance={rewardBalance} />
      <h1>Explore LP Opportunties</h1>
      <p>
        Add Market liquidity to earn fees and rewards. <a href=".">Learn more →</a>
      </p>
      <ul>
        <SquareDropdown
          onChange={(value) => {
            updateMarketsViewSettings({ primaryCategory: value, subCategories: [] });
          }}
          options={categoryItems}
          defaultValue={primaryCategory}
        />
        <SquareDropdown
          onChange={(value) => setMarketTypeFilter(value)}
          options={MARKET_TYPE_OPTIONS}
          defaultValue={MARKET_TYPE_OPTIONS[0].value}
        />
        <label html-for="toggleOnlyUserLiquidity">
          <ToggleSwitch
            id="toggleOnlyUserLiquidity"
            toggle={onlyUserLiquidity}
            clean
            setToggle={() => setOnlyUserLiquidity(!onlyUserLiquidity)}
          />
          My Liquidity Positions
        </label>
        <SearchInput value={filter} onChange={(e) => setFilter(e.target.value)} clearValue={() => setFilter("")} />
      </ul>
      <section>
        <article>
          <span>Market</span>
          {Object.keys(SORT_TYPES).map((sortType) => (
            <SortableHeaderButton
              {...{ sortType, setSortBy, sortBy, text: SORT_TYPE_TEXT[sortType], key: `${sortType}-sortable-button` }}
            />
          ))}
          <span />
        </article>
        <section>
          {sliceByPage(filteredMarkets, page, PAGE_LIMIT).map((market: MarketInfo) => (
            <LiquidityMarketCard market={market} key={market.marketId} />
          ))}
        </section>
      </section>
      {filteredMarkets.length > 0 && (
        <Pagination
          page={page}
          useFull
          itemCount={filteredMarkets.length}
          itemsPerPage={PAGE_LIMIT}
          action={(page) => {
            setPage(page);
          }}
          updateLimit={null}
          usePageLocation
        />
      )}
    </div>
  );
};

export default LiquidityView;

interface SortableHeaderButtonProps {
  setSortBy: Function;
  sortBy: { type: string | null; direction: number };
  sortType: string;
  text: string;
  key?: string;
}

const SortableHeaderButton = ({ setSortBy, sortBy, sortType, text }: SortableHeaderButtonProps): React.FC => (
  <button
    className={classNames({
      [Styles.Ascending]: sortBy.direction < 0,
    })}
    onClick={() => {
      switch (sortBy.type) {
        case sortType: {
          setSortBy({
            type: sortBy.direction < 0 ? null : sortType,
            direction: sortBy.direction < 0 ? 1 : -1,
          });
          break;
        }
        default: {
          setSortBy({
            type: sortType,
            direction: 1,
          });
          break;
        }
      }
    }}
  >
    {sortBy.type === sortType && Arrow} {text} {sortType === SORT_TYPES.REWARDS ? MaticIcon : null}
  </button>
);
