import React, { useMemo } from "react";
import classNames from "classnames";
import { useLocation } from "react-router";
import Styles from "./sports-card.styles.less";
import { CategoriesTrail } from "../categories/categories";
import { LabelComps, Links, Utils, Constants, useDataStore } from "@augurproject/comps";
import { useSportsStore } from "../stores/sport";
import { useBetslipStore } from "modules/stores/betslip";
import { getSizedPrice } from "modules/utils";
const {
  PathUtils: { parsePath },
  Formatter: { formatDai },
  DateUtils: { getMarketEndtimeFull },
  OddsUtils: { convertToNormalizedPrice, convertToOdds },
} = Utils;
const { MARKET, SPORTS_MARKET_TYPE, SPORTS_MARKET_TYPE_LABELS } = Constants;
const { ValueLabel } = LabelComps;
const { MarketLink } = Links;

export const EventCard = ({ marketEvent, ...props }) => {
  const {
    settings: { timeFormat },
  } = useSportsStore();
  const { markets, transactions } = useDataStore();
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
  const outcomeContent =
    marketEvent.marketIds.length > 1 ? (
      <SportsCardComboOutcomes {...{ marketEvent }} />
    ) : (
      <SportsCardOutcomes {...{ ...markets[marketEvent.marketIds[0]] }} />
    );

  return (
    <article className={Styles.SportsMarketCard}>
      <SportsCardTopbar {...{ market: marketEvent, timeFormat }} />
      <SportsCardTitle {...{ ...marketEvent, marketId: marketEvent.marketIds[0] }} />
      {outcomeContent}
      <SportsCardFooter {...{ marketTransactions: totalTransactionsVolume }} />
    </article>
  );
};

export const SportsCard = ({ marketId, markets, ammExchanges, timeFormat, marketTransactions, ...props }) => {
  const { marketEvents } = useSportsStore();
  const market = markets?.[marketId];
  const { description } = marketEvents?.[market?.eventId];
  return (
    <article className={Styles.SportsMarketCard}>
      <SportsCardTopbar {...{ market, timeFormat }} />
      <SportsCardTitle {...{ ...market, description }} />
      <SportsCardOutcomes {...{ ...market }} />
      <SportsCardFooter {...{ marketTransactions }} />
    </article>
  );
};

const SportsCardTopbar = ({ market, timeFormat }) => (
  <div className={Styles.SportsCardTopbar}>
    <CategoriesTrail {...{ ...market }} />
    <span>{getMarketEndtimeFull(market.startTimestamp, timeFormat)}</span>
    <span>{SocialMediaIcon}</span>
  </div>
);

const SportsCardTitle = ({ marketId, description }) => (
  <MarketLink id={marketId} dontGoToMarket={false}>
    {!!description && <span className={Styles.SportsCardTitle}>{description}</span>}
  </MarketLink>
);

export const SportsCardOutcomes = ({
  marketId,
  title,
  sportsMarketType = SPORTS_MARKET_TYPE.MONEY_LINE,
  description = "",
  amm,
  eventId,
}) => {
  const location = useLocation();
  const path = parsePath(location.pathname)[0];
  const isMarketPage = path === MARKET;
  const outcomes = [].concat(amm?.ammOutcomes || []);
  const noContest = outcomes.shift();
  if (noContest) {
    outcomes.push(noContest);
  }

  return (
    <section className={Styles.SportsCardOutcomes}>
      <header>{!!title && <span>{title}</span>}</header>
      <main>
        {outcomes?.map((outcome) => (
          <SportsOutcomeButton {...{ outcome, marketId, sportsMarketType, description, amm, eventId }} />
        ))}
      </main>
      {isMarketPage && (
        <footer className={Styles.SportsCardOutcomesFooter}>
          {FingersCrossedIcon}
          <span>Some outcome</span> is the favorite with $1.00 wagered on this market.
        </footer>
      )}
    </section>
  );
};

export const useMarketEventMarkets = (marketEvent) => {
  const { markets } = useDataStore();
  return marketEvent?.marketIds?.reduce((acc, marketId) => {
    const out = { ...acc };
    const market = markets[marketId];
    switch (market.sportsMarketType) {
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
  const marketOutcomesOrderedForDisplay = []
    .concat(marketEvent.outcomes)
    .sort((a, b) => ([a.name, b.name].includes("No Contest") ? -1 : a.id - b.id));
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
    </section>
  );
};

const ComboOutcomeRow = ({ eventMarkets, eventOutcome, marketEvent, ...props }) => {
  const {
    settings: { oddsFormat },
  } = useSportsStore();
  const {
    bets,
    actions: { addBet },
  } = useBetslipStore();
  const { name: eventOutcomeName, id: eventOutcomeId } = eventOutcome;
  const { 0: moneyLineMarket, 1: spreadMarket, 2: OUMarket } = eventMarkets;
  const { spreadLine, overUnderLine } = marketEvent;
  const spreadSizePrice = useMemo(() => getSizedPrice(spreadMarket.amm, eventOutcomeId), [
    spreadMarket.amm.ammOutcomes[eventOutcomeId].balance,
  ]);
  const spreadOdds = useMemo(
    () =>
      spreadSizePrice
        ? convertToOdds(convertToNormalizedPrice({ price: spreadSizePrice.price }), oddsFormat).full
        : "-",
    [spreadSizePrice, oddsFormat]
  );
  const moneyLineSizePrice = useMemo(() => getSizedPrice(moneyLineMarket.amm, eventOutcomeId), [
    moneyLineMarket.amm.ammOutcomes[eventOutcomeId].balance,
  ]);
  const moneyLineOdds = useMemo(
    () =>
      moneyLineSizePrice
        ? convertToOdds(convertToNormalizedPrice({ price: moneyLineSizePrice.price }), oddsFormat).full
        : "-",
    [moneyLineSizePrice, oddsFormat]
  );
  const OUSizePrice = useMemo(() => getSizedPrice(OUMarket.amm, eventOutcomeId), [
    OUMarket.amm.ammOutcomes[eventOutcomeId].balance,
  ]);
  const OUOdds = useMemo(
    () => (OUSizePrice ? convertToOdds(convertToNormalizedPrice({ price: OUSizePrice.price }), oddsFormat).full : "-"),
    [OUSizePrice, oddsFormat]
  );
  const firstOULetter = OUMarket.amm.ammOutcomes[eventOutcomeId].name.slice(0, 1);
  const overUnderLetter = firstOULetter === "N" ? null : firstOULetter;
  return (
    <article>
      <label>{eventOutcomeName}</label>
      <button
        onClick={() => {
          spreadSizePrice &&
            !bets[`${spreadMarket.marketId}-${eventOutcomeId}`] &&
            addBet({
              ...spreadMarket.amm.ammOutcomes[eventOutcomeId],
              marketId: spreadMarket.marketId,
              heading: `${marketEvent.description || spreadMarket.description}:`,
              subHeading: `${SPORTS_MARKET_TYPE_LABELS[spreadMarket.sportsMarketType]}`,
            });
        }}
        disabled={spreadOdds === "-"}
      >
        {spreadLine && spreadOdds !== "-" ? <span>{spreadLine > 0 ? `+${spreadLine}` : spreadLine}</span> : <span />}
        <span>{spreadOdds}</span>
      </button>
      <button
        onClick={() => {
          moneyLineSizePrice &&
            !bets[`${moneyLineMarket.marketId}-${eventOutcomeId}`] &&
            addBet({
              ...moneyLineMarket.amm.ammOutcomes[eventOutcomeId],
              marketId: moneyLineMarket.marketId,
              heading: `${marketEvent.description || moneyLineMarket.description}:`,
              subHeading: `${SPORTS_MARKET_TYPE_LABELS[moneyLineMarket.sportsMarketType]}`,
            });
        }}
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
              marketId: OUMarket.marketId,
              heading: `${marketEvent.description || OUMarket.description}:`,
              subHeading: `${SPORTS_MARKET_TYPE_LABELS[OUMarket.sportsMarketType]}`,
            });
        }}
        disabled={OUOdds === "-"}
      >
        {OUOdds !== "-" ? (
          <span>
            {overUnderLetter && <b>{overUnderLetter}</b>}
            {overUnderLine}
          </span>
        ) : (
          <span />
        )}
        <span>{OUOdds}</span>
      </button>
      <span>{spreadSizePrice?.size && <span>{formatDai(spreadSizePrice?.size).full}</span>}</span>
      <span>{moneyLineSizePrice?.size && <span>{formatDai(moneyLineSizePrice?.size).full}</span>}</span>
      <span>{OUSizePrice?.size && <span>{formatDai(OUSizePrice?.size).full}</span>}</span>
    </article>
  );
};

const SportsOutcomeButton = ({ outcome, marketId, description, amm, eventId, sportsMarketType }) => {
  const {
    marketEvents,
    settings: { oddsFormat },
  } = useSportsStore();
  const {
    bets,
    actions: { addBet },
  } = useBetslipStore();
  const { id, name } = outcome;
  const sizedPrice = useMemo(() => getSizedPrice(amm, id), [outcome.balance]);
  const odds = useMemo(
    () => (sizedPrice ? convertToOdds(convertToNormalizedPrice({ price: sizedPrice.price }), oddsFormat).full : "-"),
    [sizedPrice, oddsFormat]
  );
  return (
    <div className={Styles.SportsOutcomeButton}>
      <label>{name}</label>
      <button
        onClick={() =>
          sizedPrice &&
          !bets[`${marketId}-${id}`] &&
          addBet({
            ...outcome,
            marketId,
            heading: `${marketEvents?.[eventId]?.description || description}:`,
            subHeading: `${SPORTS_MARKET_TYPE_LABELS[sportsMarketType]}`,
          })
        }
        disabled={odds === "-"}
      >
        {odds}
      </button>
      {sizedPrice?.size && <span>{formatDai(sizedPrice?.size).full}</span>}
    </div>
  );
};

const SportsCardFooter = ({ marketTransactions }) => {
  const formattedVol = useMemo(
    () => marketTransactions?.volumeTotalUSD && formatDai(marketTransactions.volumeTotalUSD).full,
    [marketTransactions?.volumeTotalUSD]
  );
  return (
    <div className={Styles.SportsCardFooter}>
      <span>{RulesIcon} Rules</span>
      <ValueLabel label="total volume" value={formattedVol || "-"} />
    </div>
  );
};
const SocialMediaIcon = (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M14.9243 3.33335C14.2548 3.33335 13.7122 3.87604 13.7122 4.54548C13.7122 5.21491 14.2548 5.7576 14.9243 5.7576C15.5937 5.7576 16.1364 5.21491 16.1364 4.54548C16.1364 3.87604 15.5937 3.33335 14.9243 3.33335ZM12.0455 4.54548C12.0455 2.95556 13.3344 1.66669 14.9243 1.66669C16.5142 1.66669 17.8031 2.95556 17.8031 4.54548C17.8031 6.13539 16.5142 7.42426 14.9243 7.42426C14.1603 7.42426 13.4658 7.12663 12.9504 6.641L8.18373 9.34932C8.23204 9.55842 8.25758 9.77623 8.25758 10C8.25758 10.2238 8.23204 10.4416 8.18373 10.6507L12.9504 13.359C13.4658 12.8734 14.1603 12.5758 14.9243 12.5758C16.5142 12.5758 17.8031 13.8647 17.8031 15.4546C17.8031 17.0445 16.5142 18.3334 14.9243 18.3334C13.3344 18.3334 12.0455 17.0445 12.0455 15.4546C12.0455 15.2308 12.071 15.0129 12.1194 14.8038L7.35275 12.0955C6.83737 12.5811 6.14284 12.8788 5.37879 12.8788C3.78888 12.8788 2.5 11.5899 2.5 10C2.5 8.4101 3.78888 7.12122 5.37879 7.12122C6.14285 7.12122 6.83738 7.41888 7.35276 7.90456L12.1194 5.19626C12.071 4.98714 12.0455 4.76929 12.0455 4.54548ZM4.16667 10C4.16667 9.33057 4.70935 8.78789 5.37879 8.78789C6.04822 8.78789 6.59091 9.33057 6.59091 10C6.59091 10.6694 6.04822 11.2121 5.37879 11.2121C4.70935 11.2121 4.16667 10.6694 4.16667 10ZM13.7122 15.4546C13.7122 14.7851 14.2548 14.2424 14.9243 14.2424C15.5937 14.2424 16.1364 14.7851 16.1364 15.4546C16.1364 16.124 15.5937 16.6667 14.9243 16.6667C14.2548 16.6667 13.7122 16.124 13.7122 15.4546Z"
      fill="#555577"
    />
  </svg>
);

const RulesIcon = (
  <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
    <g clip-path="url(#clip0)">
      <path
        d="M4.25033 5.83333H12.2503M4.25033 8.5H12.2503M4.25033 11.1667H7.58366M0.916992 2.5H15.5837V14.5H0.916992V2.5Z"
        stroke="#555577"
        stroke-width="2"
        stroke-miterlimit="10"
        stroke-linecap="square"
      />
    </g>
    <defs>
      <clipPath id="clip0">
        <rect width="16" height="16" fill="white" transform="translate(0.25 0.5)" />
      </clipPath>
    </defs>
  </svg>
);

const FingersCrossedIcon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path
      d="M17.0435 1.60011C16.8597 1.5285 16.6635 1.49384 16.4663 1.49814C16.269 1.50244 16.0746 1.54561 15.8941 1.62517C15.7135 1.70473 15.5505 1.81912 15.4142 1.96179C15.278 2.10447 15.1712 2.27262 15.1 2.45661L12.363 9.50011H10C9.6791 9.49972 9.36528 9.59452 9.09828 9.77253C8.83127 9.95053 8.62306 10.2037 8.5 10.5001H7.5C7.10218 10.5001 6.72064 10.6581 6.43934 10.9395C6.15804 11.2208 6 11.6023 6 12.0001V17.5001C6.0009 18.1616 6.18926 18.8093 6.54324 19.3682C6.89721 19.927 7.40232 20.3741 8 20.6576V23.0001C8 23.1327 8.05268 23.2599 8.14645 23.3537C8.24021 23.4474 8.36739 23.5001 8.5 23.5001H15.5C15.6326 23.5001 15.7598 23.4474 15.8536 23.3537C15.9473 23.2599 16 23.1327 16 23.0001V20.3681C16.4627 20.0464 16.8408 19.6176 17.1019 19.1182C17.3631 18.6188 17.4997 18.0637 17.5 17.5001V12.0001L15.08 10.7901L17.9 3.54361C17.9716 3.35979 18.0063 3.16364 18.002 2.9664C17.9977 2.76916 17.9545 2.57471 17.8749 2.39418C17.7954 2.21364 17.681 2.05058 17.5383 1.91432C17.3956 1.77807 17.2275 1.67129 17.0435 1.60011Z"
      fill="#FFD764"
    />
    <path
      d="M11 14C10.8674 14 10.7402 13.9473 10.6464 13.8536C10.5527 13.7598 10.5 13.6326 10.5 13.5V10C10.5 9.86739 10.5527 9.74021 10.6464 9.64645C10.7402 9.55268 10.8674 9.5 11 9.5C11.1326 9.5 11.2598 9.55268 11.3536 9.64645C11.4473 9.74021 11.5 9.86739 11.5 10V13.5C11.5 13.6326 11.4473 13.7598 11.3536 13.8536C11.2598 13.9473 11.1326 14 11 14Z"
      fill="#E2AC4B"
    />
    <path
      d="M8.5 14.3125C8.36739 14.3125 8.24021 14.2598 8.14645 14.1661C8.05268 14.0723 8 13.9451 8 13.8125V11C8 10.8674 8.05268 10.7402 8.14645 10.6464C8.24021 10.5527 8.36739 10.5 8.5 10.5C8.63261 10.5 8.75979 10.5527 8.85355 10.6464C8.94732 10.7402 9 10.8674 9 11V13.8125C9 13.9451 8.94732 14.0723 8.85355 14.1661C8.75979 14.2598 8.63261 14.3125 8.5 14.3125Z"
      fill="#E2AC4B"
    />
    <path
      d="M9.5 14H17.5V13H9.5C8.96957 13 8.46086 13.2107 8.08579 13.5858C7.71071 13.9609 7.5 14.4696 7.5 15C7.5 15.5304 7.71071 16.0391 8.08579 16.4142C8.46086 16.7893 8.96957 17 9.5 17H12.5V19C12.5 19.1326 12.5527 19.2598 12.6464 19.3536C12.7402 19.4473 12.8674 19.5 13 19.5C13.1326 19.5 13.2598 19.4473 13.3536 19.3536C13.4473 19.2598 13.5 19.1326 13.5 19V16.5C13.5 16.3674 13.4473 16.2402 13.3536 16.1464C13.2598 16.0527 13.1326 16 13 16H9.5C9.23478 16 8.98043 15.8946 8.79289 15.7071C8.60536 15.5196 8.5 15.2652 8.5 15C8.5 14.7348 8.60536 14.4804 8.79289 14.2929C8.98043 14.1054 9.23478 14 9.5 14Z"
      fill="#E2AC4B"
    />
    <path
      d="M15.5818 9.50039L16.9538 5.97289C16.2948 4.22889 15.6173 2.71039 15.3268 2.07689C15.2335 2.19172 15.1579 2.31979 15.1023 2.45689L12.3633 9.50039L14.5003 10.5004L15.5818 9.50039Z"
      fill="#E2AC4B"
    />
    <path
      d="M14.362 2.37148C14.1953 2.01026 13.892 1.73004 13.5187 1.59249C13.1454 1.45493 12.7327 1.47129 12.3715 1.63798C12.0103 1.80467 11.7301 2.10803 11.5925 2.48132C11.455 2.85461 11.4713 3.26726 11.638 3.62848C12.7445 6.02598 14.5 10.4185 14.5 12V13H17.5V12C17.5 9.24998 14.683 3.06748 14.362 2.37148Z"
      fill="#FFD764"
    />
  </svg>
);
