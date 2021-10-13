import React, { useMemo } from "react";
import classNames from "classnames";
import { useLocation } from "react-router";
import Styles from "./sports-card.styles.less";
import { CategoriesTrail } from "../categories/categories";
import {
  LabelComps,
  Links,
  Utils,
  Constants,
  useDataStore,
  useAppStatusStore,
  useUserStore,
  MarketCardComps,
} from "@augurproject/comps";
import { useSportsStore } from "../stores/sport";
import { useBetslipStore } from "modules/stores/betslip";
import { getSizedPrice } from "modules/utils";
import { MODAL_EVENT_RULES } from "modules/constants";
const {
  PathUtils: { parsePath },
  Formatter: { formatDai },
  DateUtils: { getMarketEndtimeFull },
  OddsUtils: { convertToNormalizedPrice, convertToOdds },
} = Utils;
const { MARKET, SPORTS_MARKET_TYPE, SPORTS_MARKET_TYPE_LABELS, MODAL_CONNECT_WALLET, MARKET_FACTORY_TYPES } = Constants;
const { ValueLabel } = LabelComps;
const { MarketLink } = Links;
const { orderOutcomesForDisplay } = MarketCardComps;

export const EventCard = ({ marketEvent, ...props }) => {
  const {
    settings: { timeFormat },
  } = useSportsStore();
  const { transactions } = useDataStore();
  const totalTransactionsVolume = marketEvent.marketIds.reduce(
    (acc, marketId) => {
      const output = { ...acc };
      const marketTransactions = transactions[marketId];
      if (marketTransactions?.volumeTotalUSD) {
        output.volumeTotalUSD = output.volumeTotalUSD + marketTransactions.volumeTotalUSD;
      }
      return output;
    },
    { volumeTotalUSD: 0 }
  );
  const eventMarkets: object = useMarketEventMarkets(marketEvent);
  const outcomeContent =
    Object.keys(eventMarkets).length > 1 ? (
      <SportsCardComboOutcomes {...{ marketEvent }} />
    ) : (
      <SportsCardOutcomes {...{ ...Object.values(eventMarkets)[0] }} />
    );

  return (
    <article className={Styles.SportsMarketCard}>
      <SportsCardTopbar {...{ market: marketEvent, timeFormat }} />
      <SportsCardTitle {...{ ...marketEvent, marketId: marketEvent.marketIds[0] }} />
      {outcomeContent}
      <SportsCardFooter {...{ marketTransactions: totalTransactionsVolume, marketEvent }} />
    </article>
  );
};

const SportsCardTopbar = ({ market }) => (
  <div className={Styles.SportsCardTopbar}>
    <CategoriesTrail {...{ ...market }} />
  </div>
);

const SportsCardTitle = ({ marketId, description, startTimestamp }) => {
  const {
    settings: { timeFormat },
  } = useSportsStore();
  return (
    <MarketLink id={marketId} dontGoToMarket={false}>
      {!!description && <span className={Styles.SportsCardTitle}>{description}</span>}
      <span>{getMarketEndtimeFull(startTimestamp, timeFormat)}</span>
    </MarketLink>
  );
};
export const SportsCardOutcomes = ({
  marketId,
  sportsMarketType = SPORTS_MARKET_TYPE.MONEY_LINE,
  description = "",
  amm,
  eventId,
  checkForNoLiquidity = false,
}) => {
  const location = useLocation();
  const path = parsePath(location.pathname)[0];
  const isMarketPage = path === MARKET;
  const outcomes = [].concat(amm?.ammOutcomes || []);
  const noContest = outcomes.shift();
  if (noContest) {
    outcomes.push(noContest);
  }
  const noLiquidity = checkForNoLiquidity && !amm?.hasLiquidity;

  return (
    <section
      className={classNames(Styles.SportsCardOutcomes, {
        [Styles.NoLiquidity]: noLiquidity,
        [Styles.MarketPage]: isMarketPage,
      })}
    >
      <header>
        <span>{SPORTS_MARKET_TYPE_LABELS[sportsMarketType]}</span>
        {noLiquidity && <span>No Liquidity</span>}
      </header>
      <main>
        {outcomes?.map((outcome) => (
          <SportsOutcomeButton
            {...{ outcome, marketId, sportsMarketType, description, amm, eventId, key: outcome.id }}
          />
        ))}
      </main>
    </section>
  );
};

export const useMarketEventMarkets = (marketEvent) => {
  const { markets } = useDataStore();
  return marketEvent?.marketIds?.reduce((acc, marketId) => {
    const out = { ...acc };
    const market = markets[marketId];
    switch (market?.sportsMarketType) {
      case SPORTS_MARKET_TYPE.MONEY_LINE: {
        out[SPORTS_MARKET_TYPE.MONEY_LINE] = market;
        break;
      }
      case SPORTS_MARKET_TYPE.SPREAD: {
        out[SPORTS_MARKET_TYPE.SPREAD] = market;
        break;
      }
      case SPORTS_MARKET_TYPE.OVER_UNDER: {
        out[SPORTS_MARKET_TYPE.OVER_UNDER] = market;
        break;
      }
      default:
        break;
    }
    return out;
  }, {});
};

export const SportsCardComboOutcomes = ({ marketEvent }) => {
  const location = useLocation();
  const path = parsePath(location.pathname)[0];
  const isMarketPage = path === MARKET;
  const eventMarkets = useMarketEventMarkets(marketEvent);
  const marketOutcomesOrderedForDisplay = orderOutcomesForDisplay(
    [].concat(marketEvent.outcomes),
    MARKET_FACTORY_TYPES.NFL
  );

  return (
    <section className={classNames(Styles.SportsCardComboOutcomes, { [Styles.MarketPage]: isMarketPage })}>
      <header>
        <span />
        <span>SPREAD</span>
        <span>MONEY LINE</span>
        <span>OVER / UNDER</span>
      </header>
      <main>
        {marketOutcomesOrderedForDisplay.map((eventOutcome) => (
          <ComboOutcomeRow
            {...{ eventMarkets, eventOutcome, marketEvent, key: `${marketEvent.eventId}-${eventOutcome.id}-comboRow` }}
          />
        ))}
      </main>
      <section>
        {[
          eventMarkets[SPORTS_MARKET_TYPE.MONEY_LINE],
          eventMarkets[SPORTS_MARKET_TYPE.SPREAD] || null,
          eventMarkets[SPORTS_MARKET_TYPE.OVER_UNDER] || null,
        ]
          .filter((m) => !!m)
          .map((eventMarket) => (
            <SportsCardOutcomes
              {...{
                ...eventMarket,
                checkForNoLiquidity: true,
                key: `${eventMarket?.marketId}-${SPORTS_MARKET_TYPE_LABELS[eventMarket?.sportsMarketType]}-outcomes`,
              }}
            />
          ))}
      </section>
    </section>
  );
};

const ComboOutcomeRow = ({ eventMarkets, eventOutcome, marketEvent, ...props }) => {
  const {
    settings: { oddsFormat, betSizeToOdds },
  } = useSportsStore();
  const {
    bets,
    actions: { addBet },
  } = useBetslipStore();
  const { name: eventOutcomeName, id: eventOutcomeId } = eventOutcome;
  const { 0: moneyLineMarket, 1: spreadMarket, 2: OUMarket } = eventMarkets;
  const { spreadLine, overUnderLine } = marketEvent;
  const spreadSizePrice = useMemo(() => getSizedPrice(spreadMarket?.amm, eventOutcomeId, betSizeToOdds), [
    spreadMarket?.amm?.ammOutcomes[eventOutcomeId]?.balance,
    betSizeToOdds,
  ]);
  const spreadOdds = useMemo(
    () =>
      spreadSizePrice?.price
        ? convertToOdds(convertToNormalizedPrice({ price: spreadSizePrice.price }), oddsFormat).full
        : "-",
    [spreadSizePrice, oddsFormat]
  );
  const moneyLineSizePrice = useMemo(() => getSizedPrice(moneyLineMarket?.amm, eventOutcomeId, betSizeToOdds), [
    moneyLineMarket?.amm?.ammOutcomes[eventOutcomeId]?.balance,
    betSizeToOdds,
  ]);
  const moneyLineOdds = useMemo(
    () =>
      moneyLineSizePrice?.price
        ? convertToOdds(convertToNormalizedPrice({ price: moneyLineSizePrice.price }), oddsFormat).full
        : "-",
    [moneyLineSizePrice, oddsFormat]
  );
  const OUSizePrice = useMemo(() => getSizedPrice(OUMarket?.amm, eventOutcomeId, betSizeToOdds), [
    OUMarket?.amm?.ammOutcomes[eventOutcomeId]?.balance,
    betSizeToOdds,
  ]);
  const OUOdds = useMemo(
    () =>
      OUSizePrice?.price ? convertToOdds(convertToNormalizedPrice({ price: OUSizePrice.price }), oddsFormat).full : "-",
    [OUSizePrice, oddsFormat]
  );
  const firstOULetter = OUMarket?.amm?.ammOutcomes[eventOutcomeId]?.name.slice(0, 1);
  const overUnderLetter = firstOULetter === "N" ? null : firstOULetter;
  const outcomeSpread = spreadMarket?.outcomes
    ?.find((o) => o?.id === eventOutcomeId)
    ?.name?.replace(eventOutcomeName, "")
    .trim();

  return (
    <article>
      <label>{eventOutcomeName}</label>
      <button
        onClick={() => {
          spreadSizePrice &&
            !bets[`${spreadMarket.marketId}-${eventOutcomeId}`] &&
            addBet({
              ...spreadMarket.amm.ammOutcomes[eventOutcomeId],
              ...spreadSizePrice,
              outcomeId: eventOutcomeId,
              marketId: spreadMarket.marketId,
              heading: `${marketEvent.description || spreadMarket.description}:`,
              subHeading: `${SPORTS_MARKET_TYPE_LABELS[spreadMarket.sportsMarketType]}`,
            });
        }}
        title={
          spreadOdds === "-" ? "Decrease 'Bet Size to Odds Display' in settings to show available odds" : spreadOdds
        }
        disabled={spreadOdds === "-"}
      >
        {spreadLine && spreadOdds !== "-" && outcomeSpread !== "" && outcomeSpread !== "No Contest" ? (
          <span>{outcomeSpread}</span>
        ) : (
          <span />
        )}
        <span>{spreadOdds}</span>
      </button>
      <button
        onClick={() => {
          moneyLineSizePrice &&
            !bets[`${moneyLineMarket.marketId}-${eventOutcomeId}`] &&
            addBet({
              ...moneyLineMarket.amm.ammOutcomes[eventOutcomeId],
              ...moneyLineSizePrice,
              outcomeId: eventOutcomeId,
              marketId: moneyLineMarket.marketId,
              heading: `${marketEvent.description || moneyLineMarket.description}:`,
              subHeading: `${SPORTS_MARKET_TYPE_LABELS[moneyLineMarket.sportsMarketType]}`,
            });
        }}
        title={
          moneyLineOdds === "-"
            ? "Decrease 'Bet Size to Odds Display' in settings to show available odds"
            : moneyLineOdds
        }
        disabled={moneyLineOdds === "-"}
      >
        <span />
        <span>{moneyLineOdds}</span>
      </button>
      <button
        onClick={() => {
          OUSizePrice &&
            !bets[`${OUMarket.marketId}-${eventOutcomeId}`] &&
            addBet({
              ...OUMarket.amm.ammOutcomes[eventOutcomeId],
              ...OUSizePrice,
              outcomeId: eventOutcomeId,
              marketId: OUMarket.marketId,
              heading: `${marketEvent.description || OUMarket.description}:`,
              subHeading: `${SPORTS_MARKET_TYPE_LABELS[OUMarket.sportsMarketType]}`,
            });
        }}
        title={
          OUOdds === "-"
            ? "Decrease 'Bet Size to Odds Display' in settings to show available odds"
            : OUOdds
        }
        disabled={OUOdds === "-"}
      >
        {OUOdds !== "-" && overUnderLetter ? (
          <span>{overUnderLetter ? `${overUnderLetter} ${overUnderLine}` : `${overUnderLine}`}</span>
        ) : (
          <span />
        )}
        <span>{OUOdds}</span>
      </button>
      <span>
        {spreadSizePrice?.size && spreadSizePrice?.size !== "0" && <span>{formatDai(spreadSizePrice?.size).full}</span>}
      </span>
      <span>
        {moneyLineSizePrice?.size && moneyLineSizePrice?.size !== "0" && (
          <span>{formatDai(moneyLineSizePrice?.size).full}</span>
        )}
      </span>
      <span>{OUSizePrice?.size && OUSizePrice?.size !== "0" && <span>{formatDai(OUSizePrice?.size).full}</span>}</span>
    </article>
  );
};

const SportsOutcomeButton = ({ outcome, marketId, description, amm, eventId, sportsMarketType }) => {
  const {
    marketEvents,
    settings: { oddsFormat, betSizeToOdds },
  } = useSportsStore();
  const {
    bets,
    actions: { addBet },
  } = useBetslipStore();
  const {
    isLogged,
    actions: { setModal },
  } = useAppStatusStore();
  const { transactions } = useUserStore();
  const { id, name } = outcome;
  const sizedPrice = useMemo(() => getSizedPrice(amm, id, betSizeToOdds), [outcome.balance, betSizeToOdds]);
  const odds = useMemo(
    () =>
      sizedPrice?.price ? convertToOdds(convertToNormalizedPrice({ price: sizedPrice.price }), oddsFormat).full : "-",
    [sizedPrice, oddsFormat]
  );
  return (
    <div className={Styles.SportsOutcomeButton}>
      <label>{name}</label>
      <button
        onClick={() => {
          if (!isLogged) {
            setModal({
              type: MODAL_CONNECT_WALLET,
              darkMode: false,
              autoLogin: false,
              transactions,
            });
          } else {
            sizedPrice &&
              !bets[`${marketId}-${id}`] &&
              addBet({
                ...outcome,
                ...sizedPrice,
                marketId,
                outcomeId: id,
                heading: `${marketEvents?.[eventId]?.description || description}:`,
                subHeading: `${SPORTS_MARKET_TYPE_LABELS[sportsMarketType]}`,
              });
          }
        }}
        title={odds === "-" ? "Decrease 'Bet Size to Odds Display' in settings to show available odds" : odds}
        disabled={odds === "-"}
      >
        {odds}
      </button>
      {sizedPrice?.size && sizedPrice.size !== "0" && <span>{formatDai(sizedPrice?.size).full}</span>}
    </div>
  );
};

const SportsCardFooter = ({ marketTransactions, marketEvent = null }) => {
  const {
    actions: { setModal },
  } = useAppStatusStore();
  const formattedVol = useMemo(
    () => marketTransactions?.volumeTotalUSD && formatDai(marketTransactions.volumeTotalUSD).full,
    [marketTransactions?.volumeTotalUSD]
  );
  return (
    <div className={Styles.SportsCardFooter}>
      <button onClick={() => setModal({ type: MODAL_EVENT_RULES, marketEvent })}>{RulesIcon} Rules</button>
      <ValueLabel label="total volume" value={formattedVol || "-"} />
    </div>
  );
};

const RulesIcon = (
  <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
    <g clipPath="url(#clip0)">
      <path
        d="M4.25033 5.83333H12.2503M4.25033 8.5H12.2503M4.25033 11.1667H7.58366M0.916992 2.5H15.5837V14.5H0.916992V2.5Z"
        stroke="#555577"
        strokeWidth="2"
        strokeMiterlimit="10"
        strokeLinecap="square"
      />
    </g>
    <defs>
      <clipPath id="clip0">
        <rect width="16" height="16" fill="white" transform="translate(0.25 0.5)" />
      </clipPath>
    </defs>
  </svg>
);
