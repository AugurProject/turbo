import React from "react";
import Styles from "./tables.styles.less";
import { useSportsStore } from "../stores/sport";
import { Utils, ButtonComps, PaginationComps } from "@augurproject/comps";
import { ActiveBetType } from "../stores/constants";
import { formatDai } from "@augurproject/comps/build/utils/format-number";
import { approveOrCashOut } from "modules/utils";
import { useUserStore } from "@augurproject/comps";
import { useDataStore } from "@augurproject/comps";
import { CASHOUT_NOT_AVAILABLE } from "modules/constants";
import { useBetslipStore } from "modules/stores/betslip";
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
      updateActive({ ...bet, hash: txDetails.hash }, true)
    }
  }

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
        const { marketId, cashoutAmount, price, marketEventType, name, wager, toWin, isApproved, canCashOut, isPending, timestamp } = bet;
        const market = markets[marketId]
        const cashout = formatDai(cashoutAmount).formatted;
        const buttonName = !canCashOut
          ? CASHOUT_NOT_AVAILABLE
          : !isApproved ? `APPROVE CASHOUT $${cashout}` : isPending
            ? `PENDING $${cashout}`
            : `CASHOUT: $${cashout}`;
        return (
          <ul key={tx_hash}>
            <li>
              <span>{name}</span>
              <span>{marketEventType}</span>
            </li>
            <li>${wager}</li>
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
          </ul>
        );
      })}
    </main>
  );
};
