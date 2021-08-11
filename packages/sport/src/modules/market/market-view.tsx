import React, { useEffect, useState } from "react";
import { useLocation } from "react-router";
import Styles from "./market-view.styles.less";
import classNames from "classnames";
import SportsChartSection from "../charts/charts";
import {
  Constants,
  useAppStatusStore,
  useDataStore,
  useScrollToTopOnMount,
  Utils,
  Components,
  DerivedMarketData,
  Stores,
  Links,
  createBigNumber,
} from "@augurproject/comps";
import type { MarketInfo, AmmOutcome, MarketOutcome, AmmExchange } from "@augurproject/comps/build/types";
import { MARKETS_LIST_HEAD_TAGS } from "../seo-config";
import { useSportsStore } from "../stores/sport";
import { MARKETS } from "modules/constants";
import { SportsCardOutcomes, SportsCardComboOutcomes } from "../sports-card/sports-card";
import { CategoriesTrail } from "../categories/categories";
import { Link } from "react-router-dom";
import { MarketEvent } from "../stores/constants";
const {
  SEO,
  LabelComps: { ReportingStateLabel, NetworkMismatchBanner },
  Icons: { ConfirmedCheck, SimpleChevron },
} = Components;
const { MarketsLink } = Links;
const { getResolutionRules } = DerivedMarketData;
const { MARKET_ID_PARAM_NAME } = Constants;
const {
  Utils: { isMarketFinal },
} = Stores;
const {
  DateUtils: { getMarketEndtimeFull },
  Formatter: { formatDai, formatLiquidity },
  PathUtils: { parseQuery, makePath },
} = Utils;
let timeoutId = null;

export const combineOutcomeData = (ammOutcomes: AmmOutcome[], marketOutcomes: MarketOutcome[]) => {
  if (!ammOutcomes || ammOutcomes.length === 0) return [];
  return marketOutcomes.map((mOutcome, index) => ({
    ...mOutcome,
    ...ammOutcomes[index],
  }));
};

export const getWinningOutcome = (ammOutcomes: AmmOutcome[], marketOutcomes: MarketOutcome[]) =>
  combineOutcomeData(ammOutcomes, marketOutcomes).filter(
    ({ payoutNumerator }) => payoutNumerator !== null && payoutNumerator !== "0"
  );

const WinningOutcomeLabel = ({ winningOutcome }) => (
  <span className={Styles.WinningOutcomeLabel}>
    <span>Winning Outcome</span>
    <span>
      {winningOutcome.name}
      {ConfirmedCheck}
    </span>
  </span>
);

const useMarketQueryId = () => {
  const location = useLocation();
  const { [MARKET_ID_PARAM_NAME]: marketId } = parseQuery(location.search);
  return marketId;
};

const EmptyMarketView = () => {
  return (
    <div className={classNames(Styles.MarketView, Styles.EmptyMarketView)}>
      <section>
        <section>
          <div />
          <div />
          <div />
        </section>
        <section>
          <div />
          <div />
          <div />
        </section>
        <section>
          <div />
          <div />
          <div />
          <div />
        </section>
        <section>
          <div />
          <div />
          <div />
          <div />
        </section>
        <section>
          <div />
        </section>
      </section>
      <section>
        <div />
        <div />
        <div />
      </section>
    </div>
  );
};

const NonexistingMarketView = ({ text, showLink = false }) => {
  return (
    <div className={classNames(Styles.MarketView, Styles.NonexistingMarketView)}>
      <section>
        <section>
          <span>{text}</span>
          {showLink && (
            <Link placeholder="Markets" to={makePath(MARKETS)}>
              Return to markets list
            </Link>
          )}
        </section>
      </section>
      <section></section>
    </div>
  );
};

const MarketView = ({ defaultMarket = null }) => {
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [marketNotFound, setMarketNotFound] = useState(false);
  const marketId = useMarketQueryId();
  const { isMobile } = useAppStatusStore();
  const {
    marketEvents,
    settings: { timeFormat },
  } = useSportsStore();
  const { markets, ammExchanges, transactions } = useDataStore();
  useScrollToTopOnMount();
  const market: MarketInfo = !!defaultMarket ? defaultMarket : markets[marketId];
  const amm: AmmExchange = ammExchanges[marketId];

  useEffect(() => {
    if (!market) {
      timeoutId = setTimeout(() => {
        if (!market && marketId) {
          setMarketNotFound(true);
        }
      }, 60 * 1000);
    }

    return () => {
      clearTimeout(timeoutId);
    };
  }, [marketId]);

  useEffect(() => {
    if (timeoutId && market) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  }, [market]);

  if (marketNotFound) return <NonexistingMarketView text="Market does not exist." />;

  if (!market) return <EmptyMarketView />;
  const marketEvent: MarketEvent = marketEvents?.[market?.eventId];
  const totalEventStats = marketEvent?.marketIds
    ? marketEvent?.marketIds?.reduce(
        (acc, marketId) => {
          const output = { ...acc };
          const marketTransactions = transactions[marketId];
          const ammLiquidityUSD = markets[marketId].amm.liquidityUSD;
          if (marketTransactions?.volumeTotalUSD) {
            output.volumeTotalUSD = output.volumeTotalUSD + marketTransactions.volumeTotalUSD;
          }
          if (marketTransactions?.volume24hrTotalUSD) {
            output.volume24hrTotalUSD = output.volume24hrTotalUSD + marketTransactions.volume24hrTotalUSD;
          }
          if (ammLiquidityUSD && ammLiquidityUSD !== "NaN") {
            output.liquidityUSD = createBigNumber(output.liquidityUSD).plus(ammLiquidityUSD).toFixed();
          }
          return output;
        },
        { volumeTotalUSD: 0, volume24hrTotalUSD: 0, liquidityUSD: "0" }
      )
    : transactions[marketId] || { volumeTotalUSD: null, volume24hrTotalUSD: null, liquidityUSD: amm?.liquidityUSD };
  const outcomeContent =
    marketEvent?.marketIds && marketEvent?.marketIds?.length > 1 ? (
      <SportsCardComboOutcomes {...{ marketEvent }} />
    ) : (
      <SportsCardOutcomes {...{ ...market }} />
    );

  const details = getResolutionRules(market.sportsMarketType);
  const { startTimestamp, winner, description: marketDescription } = market;
  const { description } = marketEvent || { description: marketDescription };
  const winningOutcome = market.amm?.ammOutcomes?.find((o) => o.id === winner);
  const isFinalized = isMarketFinal(market);
  return (
    <div className={Styles.MarketView}>
      <SEO {...MARKETS_LIST_HEAD_TAGS} title={description} ogTitle={description} twitterTitle={description} />
      <section>
        <NetworkMismatchBanner />
        <div className={Styles.topRow}>
          <MarketsLink id="back-to-markets">{SimpleChevron}</MarketsLink>
          <CategoriesTrail {...{ ...market }} />
        </div>
        {!!description && <h2>{description}</h2>}
        {!!startTimestamp && <span>{getMarketEndtimeFull(startTimestamp, timeFormat)}</span>}
        {isFinalized && winningOutcome && <WinningOutcomeLabel winningOutcome={winningOutcome} />}
        <ul className={Styles.StatsRow}>
          <li>
            <span>24hr Volume</span>
            <span>{formatDai(totalEventStats.volume24hrTotalUSD || "0.00").full}</span>
          </li>
          <li>
            <span>Total Volume</span>
            <span>{formatDai(totalEventStats.volumeTotalUSD || "0.00").full}</span>
          </li>
          <li>
            <span>Liquidity</span>
            <span>{formatLiquidity(totalEventStats?.liquidityUSD || "0.00").full}</span>
          </li>
        </ul>
        {outcomeContent}
        <div
          className={classNames(Styles.Details, {
            [Styles.isClosed]: !showMoreDetails,
          })}
        >
          <h4>Market Details</h4>
          {details.map((detail, i) => (
            <p key={`${detail.substring(5, 25)}-${i}`}>{detail}</p>
          ))}
          {details.length > 1 && (
            <button onClick={() => setShowMoreDetails(!showMoreDetails)}>
              {showMoreDetails ? "Read Less" : "Read More"}
            </button>
          )}
          {details.length === 0 && <p>There are no additional details for this Market.</p>}
        </div>
        <SportsChartSection {...{ ...market }} />
      </section>
    </div>
  );
};

export default MarketView;
