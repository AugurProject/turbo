import React, { useState } from "react";
import { useLocation } from "react-router";
import Styles from "./market-view.styles.less";
import classNames from "classnames";
import SimpleChartSection from "../common/charts";
// eslint-disable-next-line
import { AddLiquidity, NetworkMismatchBanner } from "../common/labels";
// eslint-disable-next-line
import { PositionsLiquidityViewSwitcher, TransactionsTable } from "../common/tables";
import TradingForm from "./trading-form";
import {
  Constants,
  useAppStatusStore,
  useDataStore,
  useScrollToTopOnMount,
  Utils,
  Components,
  DerivedMarketData,
  ProcessData,
} from "@augurproject/comps";
import type { MarketInfo, AmmOutcome, MarketOutcome } from "@augurproject/comps/build/types";
import { MARKETS_LIST_HEAD_TAGS } from "../seo-config";
import { useSimplifiedStore } from "../stores/simplified";
import makePath from "@augurproject/comps/build/utils/links/make-path";
import { MARKETS } from "modules/constants";
import { Link } from "react-router-dom";
const {
  SEO,
  LabelComps: { CategoryIcon, CategoryLabel, CurrencyLabel, ReportingStateLabel },
  Icons: { ConfirmedCheck },
  ButtonComps: { BuySellButton },
  InputComps: { OutcomesGrid },
} = Components;
const { getSportsResolutionRules } = DerivedMarketData;
// eslint-disable-next-line
const { MARKET_STATUS, YES_NO, BUY, MARKET_ID_PARAM_NAME, DefaultMarketOutcomes } = Constants;
const {
  DateUtils: { getMarketEndtimeFull },
  Formatter: { formatDai },
  PathUtils: { parseQuery },
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
    showTradingForm,
    actions: { setShowTradingForm },
  } = useSimplifiedStore();
  const { cashes, markets, ammExchanges, loading, transactions } = useDataStore();
  useScrollToTopOnMount();
  // @ts-ignore
  const market: MarketInfo = !!defaultMarket ? defaultMarket : markets[marketId];

  // const endTimeDate = useMemo(() => getMarketEndtimeDate(market?.endTimestamp), [market?.endTimestamp]);
  const selectedOutcome = market ? market.outcomes[1] : DefaultMarketOutcomes[1];
  // add end time data full to market details when design is ready
  // const endTimeDateFull = useMemo(() => getMarketEndtimeFull(market?.endTimestamp), [market?.endTimestamp]);
  // @ts-ignore
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
  const { reportingState, title, description, startTimestamp, categories, winner } = market;
  const winningOutcome = market.amm?.ammOutcomes?.find((o) => o.id === winner);
  const marketTransactions = getCombinedMarketTransactionsFormatted(transactions, market, cashes);
  const { volume24hrTotalUSD = null, volumeTotalUSD = null } = transactions[marketId] || {};
  return (
    <div className={Styles.MarketView}>
      <SEO {...MARKETS_LIST_HEAD_TAGS} title={description} ogTitle={description} twitterTitle={description} />
      <section>
        <NetworkMismatchBanner />
        {isMobile && <ReportingStateLabel {...{ reportingState, big: true }} />}
        <div className={Styles.topRow}>
          <CategoryIcon big categories={categories} />
          <CategoryLabel big categories={categories} />
          {!isMobile && <ReportingStateLabel {...{ reportingState, big: true }} />}
          <CurrencyLabel name={amm?.cash?.name} />
        </div>
        {!!title && <h1>{title}</h1>}
        {!!description && <h2>{description}</h2>}
        {!!startTimestamp && <span>{getMarketEndtimeFull(startTimestamp, timeFormat)}</span>}
        {reportingState === MARKET_STATUS.FINALIZED && winningOutcome && (
          <WinningOutcomeLabel winningOutcome={winningOutcome} />
        )}
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
            <span>{formatDai(amm?.liquidityUSD || "0.00").full}</span>
          </li>
          {/* <li>
            <span>Expires</span>
            <span>{endTimeDate}</span>
          </li> */}
        </ul>
        <OutcomesGrid
          outcomes={amm?.ammOutcomes}
          selectedOutcome={amm?.ammOutcomes[2]}
          showAllHighlighted
          setSelectedOutcome={() => null}
          marketType={YES_NO}
          orderType={BUY}
          ammCash={amm?.cash}
          dontFilterInvalid
          noClick
          hasLiquidity={amm?.hasLiquidity}
        />
        <SimpleChartSection {...{ market, cash: amm?.cash, transactions: marketTransactions, timeFormat }} />
        <PositionsLiquidityViewSwitcher ammExchange={amm} />
        <article className={Styles.MobileLiquidSection}>
          <AddLiquidity market={market} />
        </article>
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
        <div className={Styles.TransactionsTable}>
          <span>Transactions</span>
          <TransactionsTable transactions={marketTransactions} />
        </div>
        <BuySellButton text="Buy / Sell" action={() => setShowTradingForm(true)} />
      </section>
      <section
        className={classNames({
          [Styles.ShowTradingForm]: showTradingForm,
        })}
      >
        <TradingForm initialSelectedOutcome={selectedOutcome} amm={amm} />
        <AddLiquidity market={market} />
      </section>
    </div>
  );
};

export default MarketView;
