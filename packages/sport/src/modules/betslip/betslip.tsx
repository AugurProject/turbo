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
    actions: { toggleSelectedView },
  } = useBetslipStore();
  return (
    <header className={Styles.BetslipHeader}>
      <button
        className={classNames({ [Styles.SelectedView]: selectedView === BETSLIP })}
        onClick={toggleSelectedView}
      >
        {BETSLIP}
      </button>
      <button
        className={classNames({ [Styles.SelectedView]: selectedView === ACTIVE_BETS })}
        onClick={toggleSelectedView}
      >
        {ACTIVE_BETS}
      </button>
    </header>
  );
};
