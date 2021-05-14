import React, { useEffect, useState } from "react";
import Styles from "./markets-view.styles.less";
import { AppViewStats, NetworkMismatchBanner } from "../common/labels";
import classNames from "classnames";
import { useSimplifiedStore } from "../stores/simplified";
import { TopBanner } from "../common/top-banner";
import {
  useAppStatusStore,
  useDataStore,
  useScrollToTopOnMount,
  SEO,
  Constants,
  Components,
} from "@augurproject/comps";
import type { MarketInfo } from "@augurproject/comps/build/types";

import { MARKETS_LIST_HEAD_TAGS } from "../seo-config";
const {
  SelectionComps: { SquareDropdown },
  ButtonComps: { SearchButton, SecondaryButton },
  Icons: { FilterIcon },
  MarketCardComps: { LoadingMarketCard, MarketCard },
  PaginationComps: { sliceByPage, Pagination },
  InputComps: { SearchInput },
} = Components;
const {
  SIDEBAR_TYPES,
  ALL_CURRENCIES,
  ALL_MARKETS,
  categoryItems,
  // currencyItems,
  marketStatusItems,
  OPEN,
  OTHER,
  POPULAR_CATEGORIES_ICONS,
  sortByItems,
  TOTAL_VOLUME,
  DEFAULT_MARKET_VIEW_SETTINGS,
  STARTS_SOON,
  RESOLVED,
  IN_SETTLEMENT,
  LIQUIDITY,
  MARKET_STATUS,
  TWENTY_FOUR_HOUR_VOLUME,
  CREATE,
  MODAL_ADD_LIQUIDITY,
} = Constants;

const PAGE_LIMIT = 21;

const applyFiltersAndSort = (
  passedInMarkets,
  setFilteredMarkets,
  transactions,
  { filter, categories, sortBy, currency, reportingState, showLiquidMarkets },
) => {
  let updatedFilteredMarkets = passedInMarkets;

  // immediately sort by event id and turbo id.
  updatedFilteredMarkets = updatedFilteredMarkets.sort(
    (a, b) => Number(a.eventId + a.turboId) - Number(b.eventId + b.turboId)
  );

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
    if (showLiquidMarkets && (!market.amm || !market.amm.hasLiquidity)) {
      return false;
    }
    // if (market.isInvalid) {
    //   return false;
    // }
    if (
      categories !== ALL_MARKETS &&
      categories !== OTHER &&
      market.categories[0].toLowerCase() !== categories.toLowerCase()
    ) {
      return false;
    }
    if (categories === OTHER && POPULAR_CATEGORIES_ICONS[market.categories[0].toLowerCase()]) {
      return false;
    }
    if (currency !== ALL_CURRENCIES) {
      if (!market.amm) {
        return false;
      } else if (market?.amm?.cash?.name !== currency) {
        return false;
      }
    }
    if (reportingState === OPEN) {
      if (market.reportingState !== MARKET_STATUS.TRADING) {
        return false;
      }
    } else if (reportingState === IN_SETTLEMENT) {
      if (market.reportingState !== MARKET_STATUS.REPORTING && market.reportingState !== MARKET_STATUS.DISPUTING)
        return false;
    } else if (reportingState === RESOLVED) {
      if (market.reportingState !== MARKET_STATUS.FINALIZED && market.reportingState !== MARKET_STATUS.SETTLED)
        return false;
    }
    return true;
  });

  updatedFilteredMarkets = updatedFilteredMarkets.sort((marketA, marketB) => {
    const aTransactions = transactions ? transactions[marketA.marketId] : {};
    const bTransactions = transactions ? transactions[marketB.marketId] : {};
    if (sortBy === TOTAL_VOLUME) {
      return (bTransactions?.volumeTotalUSD || 0) > (aTransactions?.volumeTotalUSD || 0) ? 1 : -1;
    } else if (sortBy === TWENTY_FOUR_HOUR_VOLUME) {
      return (bTransactions?.volume24hrTotalUSD || 0) > (aTransactions?.volume24hrTotalUSD || 0) ? 1 : -1;
    } else if (sortBy === LIQUIDITY) {
      return (Number(marketB?.amm?.liquidityUSD) || 0) > (Number(marketA?.amm?.liquidityUSD) || 0) ? 1 : -1;
    } else if (sortBy === STARTS_SOON) {
      return marketA?.startTimestamp > marketB?.startTimestamp ? 1 : -1;
    }
    return true;
  });
  if (sortBy !== STARTS_SOON) {
    const sortedIlliquid = updatedFilteredMarkets.filter((m) => m?.amm?.id === null).sort((a, b) => Number(a.eventId + a.turboId) - Number(b.eventId + b.turboId))
    ;
    // handle grouping by event Id and resort by liquidity.
    updatedFilteredMarkets = updatedFilteredMarkets
      .filter((m) => m?.amm?.id !== null)
      .concat(sortedIlliquid);
  }

  setFilteredMarkets(updatedFilteredMarkets);
};

const MarketsView = () => {
  const {
    isMobile,
    isLogged,
    actions: { setModal },
  } = useAppStatusStore();
  const {
    marketsViewSettings,
    settings: { showLiquidMarkets, timeFormat },
    actions: { setSidebar, updateMarketsViewSettings },
  } = useSimplifiedStore();
  const {
    ammExchanges,
    markets,
    transactions,
    loading: dataLoading
  } = useDataStore();
  const { sortBy, categories, reportingState, currency } = marketsViewSettings;
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filteredMarkets, setFilteredMarkets] = useState([]);
  const [filter, setFilter] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const marketKeys = Object.keys(markets);

  useScrollToTopOnMount(page);

  const handleFilterSort = () => {
    if (Object.values(markets).length > 0) {
      setLoading(false);
    }
    applyFiltersAndSort(
      Object.values(markets),
      setFilteredMarkets,
      transactions,
      {
        filter,
        categories,
        sortBy,
        currency,
        reportingState,
        showLiquidMarkets,
      },
    );
  };

  useEffect(() => {
    setPage(1);
    handleFilterSort();
  }, [sortBy, filter, categories, reportingState, currency, showLiquidMarkets.valueOf()]);

  useEffect(() => {
    handleFilterSort();
  }, [marketKeys.length]);

  let changedFilters = 0;

  Object.keys(DEFAULT_MARKET_VIEW_SETTINGS).forEach((setting) => {
    if (marketsViewSettings[setting] !== DEFAULT_MARKET_VIEW_SETTINGS[setting]) changedFilters++;
  });

  const handleNoLiquidity = (market: MarketInfo) => {
    const { amm } = market;
    if (!amm.id && isLogged) {
      setModal({
        type: MODAL_ADD_LIQUIDITY,
        market,
        liquidityModalType: CREATE,
        currency: amm?.cash?.name,
      });
    }
  };
  return (
    <div
      className={classNames(Styles.MarketsView, {
        [Styles.SearchOpen]: showFilter,
      })}
    >
      <SEO {...MARKETS_LIST_HEAD_TAGS} />
      <NetworkMismatchBanner />
      {isLogged ? <AppViewStats small={isMobile} /> : <TopBanner />}
      {isMobile && (
        <div>
          <SecondaryButton
            text={`filters${changedFilters ? ` (${changedFilters})` : ``}`}
            icon={FilterIcon}
            action={() => setSidebar(SIDEBAR_TYPES.FILTERS)}
          />
          <SearchButton
            action={() => {
              setFilter("");
              setShowFilter(!showFilter);
            }}
            selected={showFilter}
          />
        </div>
      )}
      <ul>
        <SquareDropdown
          onChange={(value) => {
            updateMarketsViewSettings({ categories: value });
          }}
          options={categoryItems}
          defaultValue={categories}
        />
        <SquareDropdown
          onChange={(value) => {
            updateMarketsViewSettings({ sortBy: value });
          }}
          options={sortByItems}
          defaultValue={sortBy}
        />
        <SquareDropdown
          onChange={(value) => {
            updateMarketsViewSettings({ reportingState: value });
          }}
          options={marketStatusItems}
          defaultValue={reportingState}
        />
        {/* <SquareDropdown
          onChange={(value) => {
            updateMarketsViewSettings({ currency: value });
          }}
          options={currencyItems}
          defaultValue={currency}
        /> */}
        <SearchButton
          selected={showFilter}
          action={() => {
            setFilter("");
            setShowFilter(!showFilter);
          }}
          showFilter={showFilter}
        />
      </ul>
      <SearchInput
        value={filter}
        // @ts-ignore
        onChange={(e) => setFilter(e.target.value)}
        clearValue={() => setFilter("")}
        showFilter={showFilter}
      />
      {!isLogged ? (
        <section>
          <div className={Styles.EmptyMarketsMessage}>Please Connect A Wallet to load data.</div>
        </section>
      ) : (loading && dataLoading) ? (
        <section>
          {new Array(PAGE_LIMIT).fill(null).map((m, index) => (
            <LoadingMarketCard key={index} />
          ))}
        </section>
      ) : filteredMarkets.length > 0 ? (
        <section>
          {sliceByPage(filteredMarkets, page, PAGE_LIMIT).map((market, index) => (
            <MarketCard
              key={`${market.marketId}-${index}`}
              marketId={market.marketId}
              markets={markets}
              ammExchanges={ammExchanges}
              handleNoLiquidity={handleNoLiquidity}
              noLiquidityDisabled={!isLogged}
              timeFormat={timeFormat}
              marketTransactions={transactions[market.marketId]}
            />
          ))}
        </section>
      ) : (
        <span className={Styles.EmptyMarketsMessage}>No markets to show. Try changing the filter options.</span>
      )}
      {filteredMarkets.length > 0 && (
        <Pagination
          page={page}
          itemCount={filteredMarkets.length}
          itemsPerPage={PAGE_LIMIT}
          action={(page) => {
            setPage(page);
          }}
          updateLimit={null}
        />
      )}
    </div>
  );
};

export default MarketsView;
