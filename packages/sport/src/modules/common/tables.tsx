import React from "react";
import Styles from "./tables.styles.less";
import { useSportsStore } from "../stores/sport";
import { Utils, PaginationComps, ButtonComps } from "@augurproject/comps";
import { ActiveBetType } from "../stores/constants";
import { formatDai } from "@augurproject/comps/build/utils/format-number";
import { approveCashOut, makeCashOut } from "modules/utils";
import { useUserStore } from "@augurproject/comps";
import { useDataStore } from "@augurproject/comps";
const {
  DateUtils: { getDateTimeFormat, getMarketEndtimeFull },
  OddsUtils: { convertToNormalizedPrice, convertToOdds },
} = Utils;
const { Pagination } = PaginationComps;
const { TinyThemeButton } = ButtonComps;

export const EventBetsSection = ({ eventPositionData = {} }) => {
  if (!Object.keys(eventPositionData).length) return null;
  const EventDataEntries = Object.entries(eventPositionData);
  return (
    <section className={Styles.EventBetsSection}>
      {EventDataEntries.map(([EventId, Event]) => (
        <EventBetsTable {...{ Event, key: EventId }} />
      ))}
      {EventDataEntries.length > 0 && (
        <Pagination
          page={1}
          itemCount={EventDataEntries.length}
          itemsPerPage={10}
          action={(page) => {
            // setPage(page);
            console.log("set page", page);
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

const EventTableMain = ({ bets }: { [tx_hash: string]: ActiveBetType }) => {
  const {
    settings: { oddsFormat, timeFormat },
  } = useSportsStore();
  const {
    account,
    loginAccount,
  } = useUserStore();
  const { markets } = useDataStore();
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
        const market = markets[bet.marketId]
        const cashout = formatDai(bet.cashoutAmount).formatted;
        const buttonName = !bet.hasCashedOut && !bet.canCashOut
          ? "CASHOUT NOT AVAILABLE"
          : !bet.isApproved ? `APPROVE CASHOUT $${cashout}` : bet.hasCashedOut
            ? `WON: $${cashout}`
            : `CASHOUT: $${cashout}`;
        return (
          <ul key={tx_hash}>
            <li>
              <span>{bet.name}</span>
              <span>{bet.marketEventType}</span>
            </li>
            <li>${bet.wager}</li>
            <li>{convertToOdds(convertToNormalizedPrice({ price: bet.price }), oddsFormat).full}</li>
            <li>{bet.toWin && bet.toWin !== "0" ? `$${bet.toWin}` : "-"}</li>
            <li>{getMarketEndtimeFull(bet.timestamp, timeFormat)}</li>
            <li>
              <TinyThemeButton
                customClass={determineClasses(bet)}
                action={!bet.isApproved ? () => approveCashOut(loginAccount, bet, market) : () => makeCashOut(loginAccount, bet, market)}
                disabled={bet.hasCashedOut || (!bet.hasCashedOut && !bet.canCashOut)}
                text={buttonName}
              />
            </li>
          </ul>
        );
      })}
    </main>
  );
};
