import React, { useState } from "react";
import Styles from "./tables.styles.less";
import { Utils, ButtonComps, PaginationComps, useUserStore, useDataStore } from "@augurproject/comps";
import { ActiveBetType } from "../stores/constants";
import { useSportsStore } from "../stores/sport";
import { useBetslipStore } from "../stores/betslip";
import { TicketBreakdown } from "../betslip/betslip";

import { approveOrCashOut } from "../utils";
import { CASHOUT_NOT_AVAILABLE } from "../constants";

const {
  Formatter: { formatDai },
  DateUtils: { getDateTimeFormat, getMarketEndtimeFull },
  OddsUtils: { convertToNormalizedPrice, convertToOdds },
} = Utils;
const { Pagination } = PaginationComps;
const { TinyThemeButton } = ButtonComps;

export const EventBetsSection = ({ eventPositionData = {} }) => {
  const [page, setPage] = useState(1);
  if (!Object.keys(eventPositionData).length) return null;
  const EventDataEntries = Object.entries(eventPositionData);
  return (
    <section className={Styles.EventBetsSection}>
      {EventDataEntries.map(([EventId, Event]) => (
        <EventBetsTable {...{ Event, key: EventId }} />
      ))}
      {EventDataEntries.length > 0 && (
        <Pagination
          page={page}
          itemCount={EventDataEntries.length}
          itemsPerPage={10}
          action={(page) => {
            setPage(page);
          }}
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
    actions: { updateActive },
  } = useBetslipStore();
  const {
    loginAccount,
    actions: { addTransaction },
  } = useUserStore();
  const { markets } = useDataStore();
  const determineClasses = ({ canCashOut }) => ({
    [Styles.CanCashOut]: canCashOut,
  });

  const doApproveOrCashOut = async (loginAccount, bet, market) => {
    const txDetails = await approveOrCashOut(loginAccount, bet, market);
    if (txDetails?.hash) {
      addTransaction(txDetails);
      updateActive({ ...bet, hash: txDetails.hash }, true);
    }
  };

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
        const {
          marketId,
          cashoutAmount,
          price,
          subHeading,
          name,
          wager,
          toWin,
          isApproved,
          canCashOut,
          isPending,
          timestamp,
        } = bet;
        const market = markets[marketId];
        const cashout = formatDai(cashoutAmount).formatted;
        const buttonName = !canCashOut
          ? CASHOUT_NOT_AVAILABLE
          : !isApproved
          ? `APPROVE CASHOUT $${cashout}`
          : isPending
          ? `PENDING $${cashout}`
          : `CASHOUT: $${cashout}`;

        return (
          <ul key={tx_hash}>
            <li>
              <span>{name}</span>
              <span>{subHeading}</span>
            </li>
            <li>${wager === "0.00" ? "-" : wager}</li>
            <li>{convertToOdds(convertToNormalizedPrice({ price }), oddsFormat).full}</li>
            <li>{toWin && toWin !== "0" ? `$${toWin}` : "-"}</li>
            <li>{getMarketEndtimeFull(timestamp, timeFormat)}</li>
            <li>
              <TinyThemeButton
                customClass={determineClasses(bet)}
                action={() => doApproveOrCashOut(loginAccount, bet, market)}
                disabled={isPending || !canCashOut}
                text={buttonName}
              />
            </li>
            <TicketBreakdown {...{ bet, timeFormat }} />
          </ul>
        );
      })}
    </main>
  );
};
