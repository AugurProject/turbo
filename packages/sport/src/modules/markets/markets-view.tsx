import React, { useEffect, useState } from "react";
import Styles from "./markets-view.styles.less";
import classNames from "classnames";
import { useSportsStore } from "../stores/sport";
import {
  useAppStatusStore,
  useDataStore,
  useScrollToTopOnMount,
  SEO,
  Constants,
  Components,
  getCategoryIconLabel,
  ContractCalls
} from "@augurproject/comps";
import { TopBanner } from '../common/top-banner';
import type { MarketInfo } from "@augurproject/comps/build/types";
import { MARKETS_LIST_HEAD_TAGS } from "../seo-config";
import { CategoriesArea, DailyFutureSwitch, CategoriesAreaTitle } from "../categories/categories";
import { EventCard } from "../sports-card/sports-card";
const { canAddLiquidity } = ContractCalls;
const {
  SelectionComps: { SquareDropdown },
  MarketCardComps: { LoadingMarketCard },
  PaginationComps: { Pagination, sliceByPage },
  InputComps: { SearchInput },
  LabelComps: { NetworkMismatchBanner },
} = Components;
const {
  ALL_CURRENCIES,
  ALL_MARKETS,
  OPEN,
  OTHER,
  POPULAR_CATEGORIES_ICONS,
  sortByItems,
  TOTAL_VOLUME,
  STARTS_SOON,
  RESOLVED,
  IN_SETTLEMENT,
  LIQUIDITY,
  MARKET_STATUS,
  TWENTY_FOUR_HOUR_VOLUME,
  CREATE,
  SPORTS,
  MODAL_ADD_LIQUIDITY,
} = Constants;

const PAGE_LIMIT = 10;

const applyFiltersAndSort = (
  passedInMarkets,
  passedInMarketEvents,
  { setFilteredEvents },
  transactions,
  { filter, primaryCategory, subCategories, sortBy, currency, reportingState, showLiquidMarkets, eventTypeFilter },
) => {
  let updatedFilteredMarkets = passedInMarkets;

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
    if (
      primaryCategory !== "" &&
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

    const mod = reportingState === RESOLVED ? -1 : 1;
    if (sortBy === TOTAL_VOLUME) {
      return (bTransactions?.volumeTotalUSD || 0) > (aTransactions?.volumeTotalUSD || 0) ? 1 : -1;
    } else if (sortBy === TWENTY_FOUR_HOUR_VOLUME) {
      return (bTransactions?.volume24hrTotalUSD || 0) > (aTransactions?.volume24hrTotalUSD || 0) ? 1 : -1;
    } else if (sortBy === LIQUIDITY) {
      return (Number(marketB?.amm?.liquidityUSD) || 0) > (Number(marketA?.amm?.liquidityUSD) || 0) ? 1 : -1;
    } else if (sortBy === STARTS_SOON) {
      return (marketA?.startTimestamp > marketB?.startTimestamp ? 1 : -1) * mod;
    }
    return true;
  });

  if (sortBy !== STARTS_SOON) {
    // if we aren't doing start time, then move illiquid markets to the back
    // half of the list, also sort by start time ascending for those.
    const sortedIlliquid = updatedFilteredMarkets
      .filter((m) => m?.amm?.id === null)
      .sort((a, b) => (a?.startTimestamp > b?.startTimestamp ? 1 : -1));

    updatedFilteredMarkets = updatedFilteredMarkets.filter((m) => m?.amm?.id !== null).concat(sortedIlliquid);
  } else {
    // it is sort by, make sure to put markets that are before now to the end 
    // of the list and order them with most recently started to oldest market.
    const date = new Date();
    const now = Math.floor(date.getTime() / 1000);
    const beforeNow = updatedFilteredMarkets.filter(m => m.startTimestamp <= now).sort((a, b) => b.startTimestamp - a.startTimestamp);
    const afterNow = updatedFilteredMarkets.filter(m => m.startTimestamp > now);
    updatedFilteredMarkets = afterNow.concat(beforeNow);
  }

  // TODO: Strip out futures/dailes:
  if (subCategories.length > 0) {
    // here we should filter based on `eventTypeFilter` (0 = Daily, 1 = Futures)
  }
  const updatedEvents = updatedFilteredMarkets.reduce((acc, market) => {
    const output = [].concat(acc);
    const { eventId } = market;
    const event = passedInMarketEvents[eventId];
    if (eventId && event && !output.find((event) => event?.eventId === eventId)) {
      output.push(event);
    }
    return output;
  }, []);

  setFilteredEvents(updatedEvents);
};

const MarketsView = () => {
  const {
    isLogged,
    actions: { setModal },
  } = useAppStatusStore();
  const {
    marketEvents,
    filteredEvents,
    marketsViewSettings,
    settings: { showLiquidMarkets },
    actions: { updateMarketsViewSettings, setFilteredEvents },
  } = useSportsStore();
  const { markets, transactions } = useDataStore();
  const { subCategories, sortBy, primaryCategory, reportingState, currency } = marketsViewSettings;
  const selectedCategories = [primaryCategory].concat(subCategories);
  const [eventTypeFilter, setEventTypeFilter] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const marketKeys = Object.keys(markets);

  useScrollToTopOnMount(page);

  const handleFilterSort = () => {
    if (Object.values(markets).length > 0) {
      setLoading(false);
    }
    applyFiltersAndSort(
      Object.values(markets),
      marketEvents,
      { setFilteredEvents },
      transactions,
      {
        filter,
        primaryCategory,
        subCategories,
        sortBy,
        currency,
        reportingState,
        showLiquidMarkets,
        eventTypeFilter,
      }
    );
  };

  useEffect(() => {
    setPage(1);
    handleFilterSort();
  }, [
    sortBy,
    filter,
    primaryCategory,
    subCategories,
    reportingState,
    currency,
    showLiquidMarkets.valueOf(),
    eventTypeFilter
  ]);

  useEffect(() => {
    handleFilterSort();
  }, [marketKeys.length, Object.keys(marketEvents).length]);

  const handleNoLiquidity = (market: MarketInfo) => {
    const { amm } = market;
    const canAddLiq = canAddLiquidity(market);
    if (isLogged && canAddLiq) {
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
      className={Styles.MarketsView}
    >
      <CategoriesArea filteredMarkets={filteredEvents} />
      <article>
        <SEO {...MARKETS_LIST_HEAD_TAGS} />
        <NetworkMismatchBanner />
        {!isLogged && <TopBanner />}
        <ul>
        <CategoriesAreaTitle text={selectedCategories[selectedCategories.length - 1]} />
          {subCategories.length > 0 && (
            <DailyFutureSwitch selection={eventTypeFilter} setSelection={(id) => setEventTypeFilter(id)} />
          )}
          <SquareDropdown
            onChange={(value) => {
              updateMarketsViewSettings({ sortBy: value });
            }}
            options={sortByItems}
            defaultValue={sortBy}
            preLabel="Sort By"
          />
          <SearchInput
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            clearValue={() => setFilter("")}
          />
        </ul>
        {loading ? (
          <section>
            {new Array(PAGE_LIMIT).fill(null).map((m, index) => (
              <LoadingMarketCard key={index} />
            ))}
          </section>
        ) : filteredEvents.length > 0 ? (
          <section>
            {sliceByPage(filteredEvents, page, PAGE_LIMIT).map((marketEvent, index) => (
              <EventCard
                key={`${marketEvent?.eventId}-${index}`}
                marketEvent={marketEvent}
                handleNoLiquidity={handleNoLiquidity}
                noLiquidityDisabled={!isLogged}
              />
            ))}
          </section>
        ) : (
          <span className={Styles.EmptyMarketsMessage}>No markets to show. Try changing the filter options.</span>
        )}
        {filteredEvents.length > 0 && (
          <Pagination
            page={page}
            itemCount={filteredEvents.length}
            itemsPerPage={PAGE_LIMIT}
            useFull
            maxButtons={7}
            action={(page) => {
              setPage(page);
            }}
          />
        )}
      </article>
    </div>
  );
};

export default MarketsView;

export const SubCategoriesFilter = () => {
  const primaryCategory = "Sports";
  const subCategories = [];
  const updateMarketsViewSettings = (obj: any) => {};
  if (primaryCategory.toLowerCase() !== "sports") return null;
  const { icon: SportsIcon } = getCategoryIconLabel([primaryCategory]);
  const { icon: MLBIcon } = getCategoryIconLabel(["Sports", "Baseball", "MLB"]);
  const { icon: NBAIcon } = getCategoryIconLabel(["Sports", "Basketball", "NBA"]);
  return (
    <div className={Styles.SubCategoriesFilter}>
      <button
        className={classNames(Styles.SubCategoryFilterButton, {
          [Styles.selectedFilterCategory]: subCategories.length === 0,
        })}
        onClick={() => updateMarketsViewSettings({ subCategories: [] })}
      >
        {SportsIcon} All Sports
      </button>
      <button
        className={classNames(Styles.SubCategoryFilterButton, {
          [Styles.selectedFilterCategory]: subCategories.includes("MLB"),
        })}
        onClick={() => updateMarketsViewSettings({ subCategories: ["Baseball", "MLB"] })}
      >
        {MLBIcon} MLB
      </button>
      <button
        className={classNames(Styles.SubCategoryFilterButton, {
          [Styles.selectedFilterCategory]: subCategories.includes("NBA"),
        })}
        onClick={() => updateMarketsViewSettings({ subCategories: ["Basketball", "NBA"] })}
      >
        {NBAIcon} NBA
      </button>
    </div>
  );
};
