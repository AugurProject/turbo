import React from "react";
import classNames from "classnames";
import Styles from "./tables.styles.less";
import { useSportsStore } from "../stores/sport";
import { Utils, PaginationComps } from "@augurproject/comps";

const {
  DateUtils: { getDateTimeFormat, getMarketEndtimeFull },
  OddsUtils: { convertToNormalizedPrice, convertToOdds },
} = Utils;
const { sliceByPage, Pagination } = PaginationComps;

export const EventBetsSection = ({ EventPositionData = {} }) => {
  if (!Object.keys(EventPositionData).length) return null;
  const EventDataEntries = Object.entries(EventPositionData);
  return (
    <section className={Styles.EventBetsSection}>
      {EventDataEntries.map(([EventId, Event]) => (
        <EventBetsTable {...{ Event }} />
      ))}
      {EventDataEntries.length > 0 && (
          <Pagination
            page={1}
            itemCount={EventDataEntries.length}
            itemsPerPage={10}
            action={(page) => {
              // setPage(page);
              console.log('set page', page);
            }}
            updateLimit={null}
          />
        )}
    </section>
  );
};

const EventBetsTable = ({ Event }) => {
  return (
    <article className={Styles.EventBetTable}>
      <EventTableHeading {...{ Event }} />
      <EventTableMain {...{ bets: Event.bets }} />
    </article>
  );
};

const EventTableHeading = ({ Event }) => {
  const {
    settings: { timeFormat },
  } = useSportsStore();
  return (
    <header>
      <h4>{Event.eventTitle}</h4> <span>{getDateTimeFormat(Event.eventStartTime, timeFormat)}</span>
    </header>
  );
};

const EventTableMain = ({ bets }) => {
  const {
    settings: { oddsFormat, timeFormat },
  } = useSportsStore();
  const determineClasses = ({ canCashOut, hasCashedOut }) => ({
    [Styles.CanCashOut]: canCashOut,
    [Styles.hasCashedOut]: hasCashedOut,
  });
  return (
    <main className={Styles.EventTableMain}>
      <ul>
        <li>Outcome</li>
        <li>Wager</li>
        <li>Odds</li>
        <li>To Win</li>
        <li>Bet Date</li>
        <li></li>
      </ul>
      {Object.entries(bets).map(([tx_hash, bet]) => {
        return (
          <ul>
            <li>
              <span>{bet.name}</span>
              <span>{bet.marketEventType}</span>
            </li>
            <li>${bet.wager}</li>
            <li>{convertToOdds(convertToNormalizedPrice({ price: bet.price }), oddsFormat).full}</li>
            <li>{bet.toWin && bet.toWin !== "0" ? `$${bet.toWin}` : "-"}</li>
            <li>{getMarketEndtimeFull(bet.date, timeFormat)}</li>
            <li>
              <button
                className={classNames(determineClasses(bet))}
                onClick={() => {}}
                disabled={bet.hasCashedOut || (!bet.hasCashedOut && !bet.canCashOut)}
              >
                {!bet.hasCashedOut && !bet.canCashOut
                  ? "CASHOUT NOT AVAILABLE"
                  : bet.hasCashedOut
                  ? `WON: $${bet.cashoutAmount}`
                  : `CASHOUT: $${bet.cashoutAmount}`}
              </button>
            </li>
          </ul>
        );
      })}
    </main>
  );
};
