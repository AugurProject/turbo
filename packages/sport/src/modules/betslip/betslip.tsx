import React from "react";
import classNames from "classnames";
import Styles from "./betslip.styles.less";
import { useBetslipStore } from "../stores/betslip";
import { BETSLIP, ACTIVE_BETS } from "../constants";

export const Betslip = () => {
  return (
    <section className={Styles.Betslip}>
      <div>
        <BetslipHeader />
      </div>
    </section>
  );
};

const BetslipHeader = () => {
  const {
    selectedView,
    active,
    bets,
    actions: { toggleSelectedView },
  } = useBetslipStore();
  const counts = [bets.length, active.length];
  return (
    <header className={Styles.BetslipHeader}>
      <button
        className={classNames({ [Styles.SelectedView]: selectedView === BETSLIP, [Styles.isPopulated]: counts[0] > 0 })}
        onClick={toggleSelectedView}
      >
        {BETSLIP} <span>{counts[0]}</span>
      </button>
      <button
        className={classNames({
          [Styles.SelectedView]: selectedView === ACTIVE_BETS,
          [Styles.isPopulated]: counts[1] > 0,
        })}
        onClick={toggleSelectedView}
      >
        {ACTIVE_BETS} <span>{counts[1]}</span>
      </button>
    </header>
  );
};
