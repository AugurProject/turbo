import React, { useRef, useState } from "react";
import classNames from "classnames";
import Styles from "./betslip.styles.less";
import { Link } from "react-router-dom";
import { useBetslipStore } from "../stores/betslip";
import { BetType } from "../stores/constants";
import { BETSLIP, ACTIVE_BETS } from "../constants";
import {
  ButtonComps,
  useAppStatusStore,
  useUserStore,
  useDataStore,
  Constants,
  OddsUtils,
  Formatter,
  DateUtils,
  Icons,
  PathUtils,
  createBigNumber,
  Links,
  windowRef,
} from "@augurproject/comps";
import { useSportsStore } from "modules/stores/sport";
import { getBuyAmount, makeBet } from "modules/utils";

const { PrimaryThemeButton, SecondaryThemeButton } = ButtonComps;
const { makePath } = PathUtils;
const { MODAL_CONNECT_WALLET, TX_STATUS, PORTFOLIO, ZERO } = Constants;
const { SimpleCheck, SimpleChevron } = Icons;
const { getDateTimeFormat } = DateUtils;
const { formatDai } = Formatter;
const { convertToNormalizedPrice, convertToOdds } = OddsUtils;
const { ReceiptLink } = Links;

export const MOCK_PROMPT_SIGNATURE = ({ name = "404 NAME NOT FOUND", action = "to place order for" }) =>
  windowRef.confirm(`Mock Sign a transaction ${action} ${name}?`);

export const Betslip = () => {
  const { selectedView } = useBetslipStore();
  return (
    <section className={Styles.Betslip}>
      <div>
        <BetslipHeader />
        {selectedView === BETSLIP ? <BetslipMain /> : <ActiveBetsMain />}
        <BetslipFooter />
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
  const counts = [Object.keys(bets).length, Object.keys(active).length];
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
  const { isLogged } = useAppStatusStore();
  const { bets, selectedCount } = useBetslipStore();
  return isLogged && selectedCount > 0 ? (
    <main className={Styles.BetslipContent}>
      {Object.entries(bets).map(([betId, bet]) => (
        <EditableBet {...{ bet, betId, key: `${betId}-editable-bet` }} />
      ))}
    </main>
  ) : (
    <EmptyBetslip />
  );
};

const RECENT_UPDATES_TOP = (a, b) => b[1].timestamp - a[1].timestamp;

export const ActiveBetsMain = () => {
  const { isLogged } = useAppStatusStore();
  const { active, selectedCount } = useBetslipStore();
  return isLogged && selectedCount > 0 ? (
    <main className={Styles.BetslipContent}>
      {Object.entries(active).sort(RECENT_UPDATES_TOP).map(([tx_hash, bet]) => (
        <BetReciept {...{ bet, tx_hash, key: `${tx_hash}-BetReciept` }} />
      ))}
    </main>
  ) : (
    <EmptyBetslip />
  );
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
      <PrimaryThemeButton
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

const LOW_AMOUNT_ERROR = "Your bet must be greater than 0.00";

const EditableBet = ({ betId, bet }) => {
  const {
    settings: { oddsFormat },
  } = useSportsStore();
  const {
    actions: { removeBet, updateBet },
  } = useBetslipStore();
  const { markets } = useDataStore();
  const { id, marketId, heading, name, price, wager, toWin } = bet;
  const market = markets[marketId];
  const amm = market?.amm;
  const [error, setError] = useState(null);
  const [value, setValue] = useState(wager);
  const [updatedPrice, setUpdatedPrice] = useState(price);
  const initialOdds = useRef(price);
  const displayOdds = convertToOdds(convertToNormalizedPrice({ price: updatedPrice }), oddsFormat).full;
  const hasOddsChanged = initialOdds.current !== price;
  const checkErrors = (test) => {
    let returnError = null;
    if (test !== "" && (isNaN(test) || Number(test) === 0 || Number(test) < 0)) {
      returnError = LOW_AMOUNT_ERROR;
    }
    return returnError;
  };
  return (
    <article className={Styles.EditableBet}>
      <header>{heading}</header>
      <main>
        <div>
          <h6>{name}</h6>
          <span className={classNames({ [Styles.OddsChange]: hasOddsChanged })}>{displayOdds}</span>
          <button onClick={() => removeBet(betId)}>{TrashIcon}</button>
        </div>
        <div className={Styles.EditableArea}>
          <LabeledInput
            label="wager"
            onEdit={(e) => {
              setValue(e.target.value);
              if (error) {
                const newError = checkErrors(e.target.value);
                setError(newError);
              }
            }}
            onBlur={(e) => {
              const fmtValue = formatDai(value).formatted;
              const error = checkErrors(fmtValue);
              let updatedToWin = toWin;
              setError(error);
              if (!error) {
                const buyAmount = getBuyAmount(amm, id, value);
                setUpdatedPrice(buyAmount?.price)
                updatedToWin = formatDai(buyAmount?.maxProfit).formatted;
              }
              setValue(fmtValue);
              updateBet({
                ...bet,
                wager: fmtValue,
                toWin: updatedToWin,
              });
            }}
            isInvalid={!!error}
            value={value}
          />
          <div
            className={classNames(Styles.LabeledInput, {
              [Styles.Invalid]: !!error,
            })}
          >
            <span>to Win</span>
            <div>{toWin}</div>
          </div>
          {error && <span>{error}</span>}
        </div>
      </main>
    </article>
  );
};

const LabeledInput = ({
  label,
  value = null,
  onEdit = (e) => {},
  onBlur = (e) => {},
  isInvalid = false,
  disabled = false,
}) => {
  return (
    <div
      className={classNames(Styles.LabeledInput, {
        [Styles.Invalid]: isInvalid,
      })}
    >
      <span>{label}</span>
      <input type="number" min={0} value={value} placeholder="" onChange={onEdit} onBlur={onBlur} disabled={disabled} />
    </div>
  );
};

const BetReciept = ({ tx_hash, bet }) => {
  const {
    settings: { oddsFormat, timeFormat },
  } = useSportsStore();
  const {
    actions: { removeActive },
  } = useBetslipStore();
  const { price, name, heading, status, canCashOut, hasCashedOut } = bet;
  const txStatus = {
    message: null,
    icon: PendingIcon,
    class: { [Styles.Pending]: true },
    action: () => console.log("nothing happens"),
  };
  let disableCashout = false;
  //TODO: do this for real, this is just for mocks stake
  if (tx_hash === "0xtxHash03") {
    disableCashout = true;
  }
  switch (status) {
    case TX_STATUS.CONFIRMED: {
      txStatus.class = {
        [Styles.Confirmed]: true,
        [Styles.HasCashedOut]: hasCashedOut,
      };
      txStatus.icon = SimpleCheck;
      break;
    }
    case TX_STATUS.FAILURE: {
      txStatus.class = { [Styles.Failed]: true };
      txStatus.icon = TrashIcon;
      txStatus.message = "Order Failed.";
      txStatus.action = () => removeActive(tx_hash);
      break;
    }
    default:
      break;
  }
  const displayOdds = convertToOdds(convertToNormalizedPrice({ price }), oddsFormat).full;

  return (
    <article className={classNames(Styles.BetReceipt, txStatus.class)}>
      <header>{heading}</header>
      <main>
        <div>
          <h6>{name}</h6>
          <span>{displayOdds}</span>
          <button onClick={txStatus.action}>{txStatus.icon}</button>
        </div>
        <TicketBreakdown bet={bet} timeFormat={timeFormat} />
        {txStatus.message && (
          <span>
            {txStatus.message}
            <button onClick={() => console.log("retry tx")}>Retry.</button>
          </span>
        )}
        {(canCashOut || hasCashedOut) && (
          <div className={classNames(Styles.Cashout, txStatus.class)}>
            {hasCashedOut && <ReceiptLink hash={tx_hash} label="VIEW TX" icon />}
            <button disabled={disableCashout}>
              {disableCashout ? "Cashout not available" : `cash${hasCashedOut ? "ed" : ""} out: $${bet.toWin}`}
            </button>
          </div>
        )}
      </main>
    </article>
  );
};

export const DashlineNormal = () => (
  <svg width="100%" height="1">
    <line x1="0" x2="100%" y1="0" y2="0" />
  </svg>
);

export const DashlineLong = () => (
  <svg width="100%" height="1">
    <line x1="0" x2="100%" y1="0" y2="0" />
  </svg>
);

const TicketBreakdown = ({ bet, timeFormat }) => {
  const { wager, toWin, timestamp } = bet;
  return (
    <ul className={Styles.TicketBreakdown}>
      <li>
        <span>Wager</span>
        <DashlineNormal />
        <span>{`$${wager}`}</span>
      </li>
      <li>
        <span>To Win</span>
        <DashlineNormal />
        <span>{`$${toWin}`}</span>
      </li>
      <li>
        <span>Date</span>
        <DashlineNormal />
        <span>{getDateTimeFormat(timestamp, timeFormat)}</span>
      </li>
    </ul>
  );
};

const determineBetTotals = (bets: Array<BetType>) => {
  let totalWager = ZERO;
  let totalToWin = ZERO;
  Object.entries(bets).forEach(([betId, bet]) => {
    totalWager = totalWager.plus(bet?.wager || "0");
    totalToWin = totalWager.plus(bet?.toWin || "0");
  });
  return { totalWager, totalToWin };
};

const BetslipFooter = () => {
  const {
    account,
    loginAccount,
    actions: { addTransaction },
  } = useUserStore();
  const { markets } = useDataStore();
  const { isLogged } = useAppStatusStore();
  const {
    selectedView,
    selectedCount,
    bets,
    actions: { cancelAllBets, addActive },
  } = useBetslipStore();
  if (!isLogged || selectedCount === 0) {
    return null;
  }
  const onBetslip = selectedView === BETSLIP;
  const { totalWager, totalToWin } = onBetslip
    ? determineBetTotals(bets)
    : {
        totalWager: ZERO,
        totalToWin: ZERO,
      };
  return (
    <footer>
      {onBetslip ? (
        <>
          <p>
            You're betting <b>{formatDai(totalWager).full}</b> and will win <b>{formatDai(totalToWin).full}</b> if you
            win
          </p>
          <SecondaryThemeButton
            text="Cancel All"
            icon={TrashIcon}
            reverseContent
            action={() => cancelAllBets()}
          />
          <PrimaryThemeButton
            text="Place Bets"
            action={async () => {
              for (const betId in bets) {
                const bet = bets[betId];
                const { amm } = markets[bet.marketId];
                const txHash = await makeBet(loginAccount?.library, amm, bet.id, bet.wager, account, amm.cash);
                if (txHash) {
                  addActive({
                    ...bet,
                    hash: txHash
                  });
                }
              }
            }}
          />
        </>
      ) : (
        <>
          <Link to={makePath(PORTFOLIO)}>{SimpleChevron} View All Bets</Link>
        </>
      )}
    </footer>
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

export const TrashIcon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path
      d="M7 6.5H7.5V6V4C7.5 3.17157 8.17157 2.5 9 2.5H15C15.8284 2.5 16.5 3.17157 16.5 4V6V6.5H17H20.5V7.5H18.0357L18 8.49873L18.5343 8.53688L18.499 9.03214L17.6323 19.1704L17.6322 19.1704L17.6317 19.1775C17.5386 20.486 16.4499 21.5 15.138 21.5H8.86202C7.55012 21.5 6.4614 20.486 6.36828 19.1777L6.36832 19.1777L6.36778 19.1713L5.47205 8.53643L5.99995 8.49873L5.96434 7.5H3.5V6.5H7ZM15 6.5H15.5V6V4V3.5H15H9H8.5V4V6V6.5H9H15ZM6.93114 7.5H6.39417L6.43241 8.03561L6.49873 8.96439L6.49868 8.96439L6.49928 8.97136L7.36602 19.1104C7.42377 19.8936 8.07617 20.5 8.86201 20.5H15.138C15.924 20.5 16.5764 19.8934 16.634 19.1098L17.5662 8.04196L17.6119 7.5H17.068H6.93114Z"
      stroke="#0E0E21"
    />
  </svg>
);

export const PendingIcon = (
  <svg viewBox="0 0 24 24" fill="none" className={Styles.animate}>
    <path
      d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 9.27455 20.9097 6.80375 19.1414 5"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke="#F59300"
    />
  </svg>
);
