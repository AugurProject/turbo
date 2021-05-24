import React from "react";
import classNames from "classnames";
import Styles from "./betslip.styles.less";
import { useBetslipStore } from "../stores/betslip";
import { BETSLIP, ACTIVE_BETS } from "../constants";
import { ButtonComps, useAppStatusStore, useUserStore, Constants } from "@augurproject/comps";
const { PrimaryButton, SecondaryButton } = ButtonComps;
const { MODAL_CONNECT_WALLET } = Constants;

export const Betslip = () => {
  const { selectedView } = useBetslipStore();
  return (
    <section className={Styles.Betslip}>
      <div>
        <BetslipHeader />
        {selectedView === BETSLIP ? <BetslipMain /> : <ActiveBetsMain />}
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
  const handleToggle = (type) => selectedView !== type && toggleSelectedView();
  return (
    <header className={Styles.BetslipHeader}>
      <button
        className={classNames({ [Styles.SelectedView]: selectedView === BETSLIP, [Styles.isPopulated]: counts[0] > 0 })}
        onClick={() => handleToggle(BETSLIP)}
      >
        {BETSLIP} <span>{counts[0]}</span>
      </button>
      <button
        className={classNames({
          [Styles.SelectedView]: selectedView === ACTIVE_BETS,
          [Styles.isPopulated]: counts[1] > 0,
        })}
        onClick={() => handleToggle(ACTIVE_BETS)}
      >
        {ACTIVE_BETS} <span>{counts[1]}</span>
      </button>
    </header>
  );
};

export const BetslipMain = () => {
  const { bets } = useBetslipStore();
  const count = bets.length;
  return count > 0 ? <main>betslip</main> : <EmptyBetslip />;
};

export const ActiveBetsMain = () => {
  const { active } = useBetslipStore();
  const count = active.length;
  return count > 0 ? <main>active bets</main> : <EmptyBetslip />;
};

export const EmptyBetslip = () => {
  const { isLogged, actions: { setModal } } = useAppStatusStore();
  const { transactions } = useUserStore();
  const content = isLogged ? (
    <>
      <p>Need help placing a bet?</p>
      <SecondaryButton text="View Tutorial" action={() => alert("Tutorial Not Yet Implemented. \n\n TODO: Build a Tutorial!")} />
    </>
  ) : (
    <>
      <p>You need to sign in to start betting!</p>
      <PrimaryButton
        text="Sign Up"
        action={() =>
          setModal({
            type: MODAL_CONNECT_WALLET,
            darkMode: false,
            autoLogin: true,
            transactions,
          })
        }
      />
    </>
  );
  return (
    <main className={Styles.EmptyBetslip}>
      <div>{EmptyBetslipIcon}</div>
      <h3>Betslip is Empty</h3>
      {content}
    </main>
  );
};

export const EmptyBetslipIcon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <g clipPath="url(#clip0)">
      <path
        d="M3.02362 12.1049L12.1049 3.02369C13.1079 3.55802 14.3207 3.55802 15.3237 3.02369L20.9764 8.67637C20.4421 9.67936 20.4421 10.8922 20.9764 11.8952L11.8951 20.9764C10.8921 20.4421 9.67929 20.4421 8.6763 20.9764L3.02362 15.3238C3.55795 14.3208 3.55795 13.1079 3.02362 12.1049Z"
        stroke="#0E0E21"
        strokeWidth="2"
      />
      <path d="M17.8571 14.0001L10 6.5" stroke="#0E0E21" strokeWidth="2" />
    </g>
    <defs>
      <clipPath id="clip0">
        <rect width="24" height="24" fill="white" />
      </clipPath>
    </defs>
  </svg>
);
