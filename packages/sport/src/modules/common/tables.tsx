import React from "react";
import classNames from 'classnames';
import Styles from "./tables.styles.less";
import { useSportsStore } from "../stores/sport";
import { Utils } from "@augurproject/comps";

const {
  DateUtils: { getDateTimeFormat, getMarketEndtimeFull },
  OddsUtils: { convertToNormalizedPrice, convertToOdds },
} = Utils;
export const EventBetsSection = ({ EventPositionData = {} }) => {
  if (!Object.keys(EventPositionData).length) return null;

  console.log(EventPositionData);
  return (
    <section className={Styles.EventBetsSection}>
      {Object.entries(EventPositionData).map(([EventId, Event]) => (
        <EventBetsTable {...{ Event }} />
      ))}
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


// "0xdeadbeef-0": {
//   eventId: '0xdeadbeef-0',
//   eventTitle: 'River Plate vs Boca Juniors',
//   eventStartTime: now,
//   bets: {
//     '0xfaketxhash01': {
//       marketId: '0xfakeMarket01',
//       marketEventType: MET.SP,
//       name: 'River Plate, +2',
//       id: 1,
//       wager: '10.00',
//       price: '0.125',
//       toWin: '70.00',
//       date: now - 2000,
//       cashoutAmount: '0.00',
//       canCashOut: true,
//       hasCashedOut: false,
//     },
const EventTableMain = ({ bets }) => {
  const {
    settings: { oddsFormat, timeFormat },
  } = useSportsStore();
  const determineClasses = ({ canCashOut, hasCashedOut }) => 
  ({ [Styles.CanCashOut]: canCashOut, [Styles.hasCashedOut]: hasCashedOut });
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
            <li>${bet.toWin}</li>
            <li>{getMarketEndtimeFull(bet.date, timeFormat)}</li>
            <li>
              <button className={classNames(determineClasses(bet))}>
                {bet.hasCashedOut ? `WON: $${bet.cashoutAmount}` : `CASHOUT: $${bet.cashoutAmount}`}
              </button>
            </li>
          </ul>
        );
      })}
    </main>
  );
};
