import React, { useState } from "react";
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
  ProcessData,
  Stores,
  Links,
} from "@augurproject/comps";
import type { MarketInfo, AmmOutcome, MarketOutcome, AmmExchange } from "@augurproject/comps/build/types";
import { MARKETS_LIST_HEAD_TAGS } from "../seo-config";
import { useSportsStore } from "../stores/sport";
import { MARKETS } from "modules/constants";
import { SportsCardOutcomes } from "../sports-card/sports-card";
import { CategoriesTrail } from "../categories/categories";
import { Link } from "react-router-dom";
const {
  SEO,
  LabelComps: { 
    ReportingStateLabel },
  Icons: { ConfirmedCheck, SimpleChevron },
  ButtonComps: { BuySellButton },
} = Components;
const { MarketsLink } = Links;
const { getSportsResolutionRules } = DerivedMarketData;
const { MARKET_ID_PARAM_NAME } = Constants;
const {
  Utils: { isMarketFinal },
} = Stores;
const {
  DateUtils: { getMarketEndtimeFull },
  Formatter: { formatDai, formatLiquidity },
  PathUtils: { parseQuery, makePath },
} = Utils;
const { getCombinedMarketTransactionsFormatted } = ProcessData;

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

const NonexistingMarketView = ({ text, showLink }) => {
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
  const marketId = useMarketQueryId();
  const { isMobile, isLogged } = useAppStatusStore();
  const {
    settings: { timeFormat },
    actions: { setShowTradingForm },
  } = useSportsStore();
  const { cashes, markets, ammExchanges, loading, transactions } = useDataStore();
  useScrollToTopOnMount();
  const market: MarketInfo = !!defaultMarket ? defaultMarket : markets[marketId];

  const amm: AmmExchange = ammExchanges[marketId];

  if ((!market && !loading) || !isLogged)
    return (
      <NonexistingMarketView
        text={!isLogged ? "Please connect a wallet to view market data." : "Market does not exist."}
        showLink={isLogged}
      />
    );
  if (!market) return <EmptyMarketView />;
  const details = getSportsResolutionRules(market.sportId, market.sportsMarketType);
  const { reportingState, title, description, startTimestamp, winner } = market;
  const winningOutcome = market.amm?.ammOutcomes?.find((o) => o.id === winner);
  const marketTransactions = getCombinedMarketTransactionsFormatted(transactions, market, cashes);
  const { volume24hrTotalUSD = null, volumeTotalUSD = null } = transactions[marketId] || {};
  const isFinalized = isMarketFinal(market);
  return (
    <div className={Styles.MarketView}>
      <SEO {...MARKETS_LIST_HEAD_TAGS} title={description} ogTitle={description} twitterTitle={description} />
      <section>
        {/* <NetworkMismatchBanner /> */}
        {isMobile && <ReportingStateLabel {...{ reportingState, big: true }} />}
        <div className={Styles.topRow}>
          <MarketsLink id="back-to-markets">{SimpleChevron}</MarketsLink>
          <CategoriesTrail {...{ ...market }} />
        </div>
        {!!title && <h1>{title}</h1>}
        {!!description && <h2>{description}</h2>}
        {!!startTimestamp && <span>{getMarketEndtimeFull(startTimestamp, timeFormat)}</span>}
        {isFinalized && winningOutcome && <WinningOutcomeLabel winningOutcome={winningOutcome} />}
        <ul className={Styles.StatsRow}>
          <li>
            <span>24hr Volume</span>
            <span>{formatDai(volume24hrTotalUSD || "0.00").full}</span>
          </li>
          <li>
            <span>Total Volume</span>
            <span>{formatDai(volumeTotalUSD || "0.00").full}</span>
          </li>
          <li>
            <span>Liquidity</span>
            <span>{formatLiquidity(amm?.liquidityUSD || "0.00").full}</span>
          </li>
        </ul>
        <SportsCardOutcomes {...{ ...market }} />
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
        <SportsChartSection {...{ market, cash: amm?.cash, transactions: marketTransactions }} />
        <BuySellButton text="Buy / Sell" action={() => setShowTradingForm(true)} />
      </section>
    </div>
  );
};

export default MarketView;
