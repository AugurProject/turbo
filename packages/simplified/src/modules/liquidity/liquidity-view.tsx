import React, { useState, useMemo, useEffect } from "react";
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
} from "@augurproject/comps";
import { categoryItems } from "../constants";
import { AppViewStats, AvailableLiquidityRewards } from "../common/labels";
import { BonusReward } from '../common/tables';
import { useSimplifiedStore } from "../stores/simplified";
import { MarketInfo } from "@augurproject/comps/build/types";
const { MODAL_ADD_LIQUIDITY, ADD, CREATE, REMOVE, ALL_MARKETS, OTHER, POPULAR_CATEGORIES_ICONS, SPORTS } = Constants;
const {
  Links: { MarketLink },
  SelectionComps: { SquareDropdown, ToggleSwitch },
  InputComps: { SearchInput },
  LabelComps: { CategoryIcon },
  MarketCardComps: { MarketTitleArea },
  ButtonComps: { PrimaryThemeButton, SecondaryThemeButton },
} = Components;
const { canAddLiquidity } = ContractCalls;
const {
  DateUtils: { getMarketEndtimeDate },
  Formatter: { formatApy, formatCash },
} = Utils;
const {
  Utils: { isMarketFinal },
} = Stores;

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

interface LiquidityMarketCardProps {
  key?: string;
  market: MarketInfo;
}

const applyFiltersAndSort = (
  passedInMarkets,
  setFilteredMarkets,
  transactions,
  userMarkets,
  { filter, primaryCategory, subCategories, marketTypeFilter, sortBy, onlyUserLiquidity }
) => {
  let updatedFilteredMarkets = passedInMarkets;

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
  setFilteredMarkets(updatedFilteredMarkets);
};

const LiquidityMarketCard = ({ market }: LiquidityMarketCardProps): React.Component => {
  const {
    settings: { timeFormat },
  } = useSimplifiedStore();
  const {
    actions: { setModal },
  } = useAppStatusStore();
  const {
    balances: { lpTokens },
  } = useUserStore();
  const { transactions } = useDataStore();
  const { marketId, categories, amm: { hasLiquidity, cash: { name: currency }}, endTimestamp } = market;
  const marketTransactions = transactions[marketId];
  const formattedApy = useMemo(() => marketTransactions?.apy && formatApy(marketTransactions.apy).full, [
    marketTransactions?.apy,
  ]);
  const formattedVol = useMemo(
    () =>
      marketTransactions?.volumeTotalUSD &&
      formatCash(marketTransactions.volumeTotalUSD, currency, { bigUnitPostfix: true }).full,
    [marketTransactions?.volumeTotalUSD]
  );
  const userHasLiquidity = lpTokens?.[marketId];
  const canAddLiq = canAddLiquidity(market);
  const isfinal = isMarketFinal(market);

  return (
    <article className={Styles.LiquidityMarketCard}>
      <MarketLink id={marketId} dontGoToMarket={false}>
        <CategoryIcon {...{ categories }} />
        <MarketTitleArea {...{ ...market, timeFormat }} />
      </MarketLink>
      <span>{endTimestamp ? getMarketEndtimeDate(endTimestamp) : "-"}</span>
      <span>{formattedVol || "-"}</span>
      <span>{formattedApy || "-"}</span>
      <span>{userHasLiquidity ? formatCash(userHasLiquidity?.usdValue, currency).full : "$0.00"}</span>
      <span>0 MATIC</span>
      <div>
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
      {userHasLiquidity && <BonusReward />}
    </article>
  );
};

const LiquidityView = () => {
  const {
    marketsViewSettings,
    actions: { updateMarketsViewSettings },
  } = useSimplifiedStore();
  const {
    balances: { lpTokens },
  } = useUserStore();
  const { markets, transactions } = useDataStore();
  const [marketTypeFilter, setMarketTypeFilter] = useState(MARKET_TYPE_OPTIONS[0].value);
  const [onlyUserLiquidity, setOnlyUserLiquidity] = useState(false);
  const [filter, setFilter] = useState("");
  const [filteredMarkets, setFilteredMarkets] = useState([]);
  const { primaryCategory, subCategories } = marketsViewSettings;
  const marketKeys = Object.keys(markets);
  const userMarkets = Object.keys(lpTokens);

  const handleFilterSort = () => {
    applyFiltersAndSort(Object.values(markets), setFilteredMarkets, transactions, userMarkets, {
      filter,
      primaryCategory,
      subCategories,
      marketTypeFilter,
      sortBy: "",
      onlyUserLiquidity,
    });
  };

  useEffect(() => {
    handleFilterSort();
  }, [filter, primaryCategory, subCategories, marketTypeFilter, onlyUserLiquidity]);

  useEffect(() => {
    handleFilterSort();
  }, [marketKeys.length, userMarkets.length]);

  return (
    <div className={Styles.LiquidityView}>
      <AppViewStats small liquidity />
      <AvailableLiquidityRewards />
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
        <span>
          <ToggleSwitch
            id="toggleOnlyUserLiquidity"
            toggle={onlyUserLiquidity}
            setToggle={() => setOnlyUserLiquidity(!onlyUserLiquidity)}
          />
          My Liquidity Positions
        </span>
        <SearchInput value={filter} onChange={(e) => setFilter(e.target.value)} clearValue={() => setFilter("")} />
      </ul>
      <section>
        <article>
          <span>Market</span>
          <button>Expires</button>
          <button>TVL</button>
          <button>APR</button>
          <button>My Liquidity</button>
          <button>My Rewards</button>
          <span />
        </article>
        <section>
          {filteredMarkets.map((market: MarketInfo) => (
            <LiquidityMarketCard market={market} key={market.marketId} />
          ))}
        </section>
      </section>
    </div>
  );
};

export default LiquidityView;
