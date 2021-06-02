import React, { useRef } from "react";
import classNames from "classnames";
import Styles from "./betslip.styles.less";
import { useBetslipStore } from "../stores/betslip";
import { BETSLIP, ACTIVE_BETS } from "../constants";
import { ButtonComps, useAppStatusStore, useUserStore, Constants, OddsUtils } from "@augurproject/comps";
import { useSportsStore } from "modules/stores/sport";
const { PrimaryButton, SecondaryButton } = ButtonComps;
const { MODAL_CONNECT_WALLET } = Constants;
const { convertToNormalizedPrice, convertToOdds } = OddsUtils;

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
  return count > 0 ? (
    <main className={Styles.BetslipContent}>
      {bets.map((bet) => (
        <EditableBet {...{ ...bet, key: `${bet.marketId}-editable-bet` }} />
      ))}
    </main>
  ) : (
    <EmptyBetslip />
  );
};

export const ActiveBetsMain = () => {
  const { active } = useBetslipStore();
  const count = active.length;
  return count > 0 ? <main>active bets</main> : <EmptyBetslip />;
};

export const EmptyBetslip = () => {
  const {
    isLogged,
    actions: { setModal },
  } = useAppStatusStore();
  const { transactions } = useUserStore();
  const content = isLogged ? (
    <>
      <p>Need help placing a bet?</p>
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

const EditableBet = ({ heading, name, wager, odds }) => {
  const {
    settings: { oddsFormat },
  } = useSportsStore();
  const initialOdds = useRef(odds);
  const displayOdds = convertToOdds(convertToNormalizedPrice({ price: odds }), oddsFormat).full;
  const hasOddsChanged = initialOdds.current !== odds;
  return (
    <article className={Styles.EditableBet}>
      <header>{heading}</header>
      <main>
        <div>
          <h6>{name}</h6>
          <span className={classNames({ [Styles.OddsChange]: hasOddsChanged })}>{displayOdds}</span>
          <button onClick={() => {}}>{TrashIcon}</button>
        </div>
        <div className={Styles.EditableArea}>
          <LabeledInput label="wager" onEdit={(e) => console.log('edit wager', e.target.value)} value="$0.00" />
          <LabeledInput label="to win" value={null} disabled />
          {/* <span>Your bet exceeds the max available for this odds</span> */}
        </div>
      </main>
    </article>
  );
};

const LabeledInput = ({ label, value = null, onEdit = (e) => {}, isInvalid = false, disabled = false }) => {
  return (
    <div className={classNames(Styles.LabeledInput, {
      [Styles.Invalid]: isInvalid,
    })}>
      <span>{label}</span>
      <input type="text" value={value} placeholder="" onChange={onEdit} disabled={disabled} />
    </div>
  )
}

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

export const TrashIcon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path
      d="M7 6.5H7.5V6V4C7.5 3.17157 8.17157 2.5 9 2.5H15C15.8284 2.5 16.5 3.17157 16.5 4V6V6.5H17H20.5V7.5H18.0357L18 8.49873L18.5343 8.53688L18.499 9.03214L17.6323 19.1704L17.6322 19.1704L17.6317 19.1775C17.5386 20.486 16.4499 21.5 15.138 21.5H8.86202C7.55012 21.5 6.4614 20.486 6.36828 19.1777L6.36832 19.1777L6.36778 19.1713L5.47205 8.53643L5.99995 8.49873L5.96434 7.5H3.5V6.5H7ZM15 6.5H15.5V6V4V3.5H15H9H8.5V4V6V6.5H9H15ZM6.93114 7.5H6.39417L6.43241 8.03561L6.49873 8.96439L6.49868 8.96439L6.49928 8.97136L7.36602 19.1104C7.42377 19.8936 8.07617 20.5 8.86201 20.5H15.138C15.924 20.5 16.5764 19.8934 16.634 19.1098L17.5662 8.04196L17.6119 7.5H17.068H6.93114Z"
      stroke="#0E0E21"
    />
  </svg>
);
