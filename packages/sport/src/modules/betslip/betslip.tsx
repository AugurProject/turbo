import React, { useRef, useState, useEffect } from "react";
import classNames from "classnames";
import Styles from "./betslip.styles.less";
import { Link } from "react-router-dom";
import { useBetslipStore } from "../stores/betslip";
import { ActiveBetType, BetType } from "../stores/constants";
import { BETSLIP, ACTIVE_BETS, CASHOUT_NOT_AVAILABLE } from "../constants";
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
  Links,
  windowRef,
  createBigNumber,
} from "@augurproject/comps";
import { useSportsStore } from "modules/stores/sport";
import { approveOrCashOut, getBuyAmount, makeBet } from "modules/utils";
import { BuyApprovals, useUserApprovals } from "modules/common/buy-approvals";
import { NFLSideBanner } from 'modules/common/top-banner';

const { PrimaryThemeButton, SecondaryThemeButton } = ButtonComps;
const { makePath } = PathUtils;
const { MODAL_CONNECT_WALLET, TX_STATUS, PORTFOLIO, ZERO, SIDEBAR_TYPES, USDC } = Constants;
const { SimpleCheck, SimpleChevron, XIcon } = Icons;
const { getDateTimeFormat } = DateUtils;
const { formatDai, formatCash } = Formatter;
const { convertToNormalizedPrice, convertToOdds } = OddsUtils;
const { ReceiptLink } = Links;

export const MOCK_PROMPT_SIGNATURE = ({ name = "404 NAME NOT FOUND", action = "to place order for" }) =>
  windowRef.confirm(`Mock Sign a transaction ${action} ${name}?`);

export const Betslip = () => {
  const { isLogged } = useAppStatusStore();
  const {
    sidebarType,
    actions: { setSidebar },
  } = useSportsStore();
  const {
    selectedView,
    active,
    oddsChangedMessage,
    bets,
    actions: { toggleSelectedView },
  } = useBetslipStore();
  const betslipRef = useRef(null);
  const counts = [Object.keys(bets).length, Object.keys(active).length];
  const handleToggle = (type) => selectedView !== type && toggleSelectedView();

  useEffect(() => {
    const handleWindowOnClick = (event) => {
      if (
        sidebarType === SIDEBAR_TYPES.BETSLIP &&
        !!event.target &&
        betslipRef?.current !== null &&
        !betslipRef?.current?.contains(event.target)
      ) {
        setSidebar(null);
      }
    };

    window.addEventListener("click", handleWindowOnClick);

    return () => {
      window.removeEventListener("click", handleWindowOnClick);
    };
  });

  return (
    <section
      className={classNames(Styles.Betslip, {
        [Styles.Open]: sidebarType === SIDEBAR_TYPES.BETSLIP,
        [Styles.NavOpen]: sidebarType === SIDEBAR_TYPES.NAVIGATION,
      })}
    >
      <div ref={betslipRef}>
      {isLogged && <SecondaryThemeButton
          text={`Betslip (${counts[0]})`}
          icon={SimpleChevron}
          small
          action={() => {
            handleToggle(BETSLIP);
            setSidebar(sidebarType ? null : SIDEBAR_TYPES.BETSLIP);
          }}
        />}
        {counts[0] > 0 && (
          <div className={Styles.MobileBetslipButtonContainer}>
            <PrimaryThemeButton
              text={`Betslip (${counts[0]})`}
              action={() => {
                handleToggle(BETSLIP);
                setSidebar(sidebarType ? null : SIDEBAR_TYPES.BETSLIP);
              }}
            />
          </div>
        )}
        <BetslipHeader {...{ counts, handleToggle }} />
        {selectedView === BETSLIP ? (
          <>
            <BetslipMain />
            <BuyApprovals />
            {oddsChangedMessage && 
              <div className={Styles.OddsChangedMessage}>
                {oddsChangedMessage}
              </div>
            }
          </>
        ) : (
          <ActiveBetsMain />
        )}
        <BetslipFooter />
      </div>
      {!isLogged && <NFLSideBanner />}
    </section>
  );
};

const BetslipHeader = ({ counts, handleToggle }: { counts: number[]; handleToggle: (type: string) => {} }) => {
  const {
    actions: { setSidebar },
  } = useSportsStore();
  const { selectedView } = useBetslipStore();
  return (
    <header className={Styles.BetslipHeader}>
      <div>
        <h2>{selectedView}</h2>
        <button
          onClick={() => {
            setSidebar(null);
          }}
        >
          {XIcon}
        </button>
      </div>
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

const ODDS_CHANGED_SINCE_SELECTION = `Highlighted odds changed since you selected them.`;
const ODDS_CHANGED_ORDER_SIZE = `You are trying to take more than is available at these odds. You can place the bet with the new odds or adjust your bet size.`;

export const BetslipMain = () => {
  const { isLogged } = useAppStatusStore();
  const {
    bets,
    selectedCount,
    oddsChangedMessage,
    actions: { setOddsChangedMessage },
  } = useBetslipStore();

  const valuesToWatch = Object.entries(bets).map(([betId, bet]: [string, BetType]) => {
    return `${bet.wagerAvgPrice}-${bet.wager}`;
  });

  useEffect(() => {
    const anyBetsChanged = Object.entries(bets).reduce((acc, [betId, bet]: [string, BetType]) => {
      if (acc === null && bet?.price && bet?.wagerAvgPrice && bet?.wager) {
        if (createBigNumber(bet.wager).gt(bet.size)) {
          return ODDS_CHANGED_ORDER_SIZE;
        } else if (bet?.price !== bet?.wagerAvgPrice) {
          return ODDS_CHANGED_SINCE_SELECTION;
        } else {
          return null;
        }
      }
      if (acc !== null) return acc;
      return null;
    }, null);
    if (anyBetsChanged !== oddsChangedMessage) {
      setOddsChangedMessage(anyBetsChanged);
    }
  }, [valuesToWatch.toString()]);

  return isLogged && selectedCount > 0 ? (
    <main className={Styles.BetslipContent}>
      {Object.entries(bets).map(([betId, bet]: [string, BetType]) => (
        <EditableBet {...{ bet, betId, key: `${betId}-editable-bet` }} />
      ))}
    </main>
  ) : (
    <EmptyBetslip />
  );
};

const RECENT_UPDATES_TOP = (a, b) => Number(b?.timestamp) - Number(a?.timestamp);

export const ActiveBetsMain = () => {
  const { isLogged } = useAppStatusStore();
  const { active, selectedCount } = useBetslipStore();
  return isLogged && selectedCount > 0 ? (
    <main className={Styles.BetslipContent}>
      {Object.values(active)
        .sort(RECENT_UPDATES_TOP)
        .map((bet: ActiveBetType) => (
          <BetReciept {...{ bet, tx_hash: bet.hash, key: `BetReciept-${bet.betId}-${bet.hash}` }} />
        ))}
    </main>
  ) : (
    <EmptyBetslip loggedMessage="You have no active bets" />
  );
};

export const EmptyBetslip = ({ loggedMessage = "Need help placing a bet?" }) => {
  const {
    isLogged,
    actions: { setModal },
  } = useAppStatusStore();
  const { transactions } = useUserStore();
  const content = isLogged ? (
    <>
      <p>{loggedMessage}</p>
    </>
  ) : (
    <>
      <p>You need to connect a wallet to start betting!</p>
      <PrimaryThemeButton
        text="Connect Wallet"
        action={() =>
          setModal({
            type: MODAL_CONNECT_WALLET,
            darkMode: false,
            autoLogin: false,
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
const HIGH_AMOUNT_ERROR = "Your bet exceeds the max available for these odds";
const ONLY_NUMBER_VALUES_REGEX = /(?:\d{1,3}(?:,\d+)*|\d+)(?:\.\d+)?$/;

const EditableBet = ({ betId, bet }) => {
  const {
    settings: { oddsFormat },
  } = useSportsStore();
  const {
    actions: { removeBet, updateBet },
  } = useBetslipStore();
  const { ammExchanges } = useDataStore();

  const { id, marketId, heading, subHeading, name, price, wager, toWin, size } = bet;
  const amm = ammExchanges[marketId];
  const [error, setError] = useState(null);
  const [value, setValue] = useState(wager);
  const [updatedPrice, setUpdatedPrice] = useState(price);
  const initialOdds = useRef(price);
  const displayOdds = updatedPrice
    ? convertToOdds(convertToNormalizedPrice({ price: updatedPrice }), oddsFormat).full
    : "-";
  const hasOddsChanged =
    initialOdds.current !== updatedPrice || (initialOdds.current === updatedPrice && Number(wager) > Number(size));
  const checkErrors = (value: string) => {
    let returnError = null;
    const test = value.split(",").join("");
    if (test !== "" && (isNaN(Number(test)) || Number(test) === 0 || Number(test) <= 0)) {
      returnError = LOW_AMOUNT_ERROR;
    }
    return returnError;
  };

  return (
    <article className={Styles.EditableBet}>
      <header>
        {heading}
        {subHeading && (
          <>
            <br />
            {subHeading}
          </>
        )}
      </header>
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
              const newValue = ONLY_NUMBER_VALUES_REGEX.exec(e.target.value)?.[0];
              if (newValue === "") {
                setError(null);
                setUpdatedPrice(price);
                updateBet({
                  ...bet,
                  wager: null,
                  toWin: null,
                  wagerAvgPrice: null,
                });
              } else {
                const fmtNewValue = formatDai(newValue).formatted;
                const nextBuyAmount = getBuyAmount(amm, id, newValue);
                if (error) {
                  const newError = checkErrors(newValue || "");
                  setError(newError);
                }
                if (nextBuyAmount?.maxProfit) {
                  setUpdatedPrice(nextBuyAmount.price);
                  updateBet({
                    ...bet,
                    wagerAvgPrice: nextBuyAmount.price,
                    wager: fmtNewValue,
                    toWin: formatDai(nextBuyAmount.maxProfit).formatted,
                  });
                } else {
                  setUpdatedPrice(null);
                  updateBet({
                    ...bet,
                    toWin: "-",
                  });
                  if (error === null) {
                    const errorCheck = checkErrors(newValue || "");
                    const error = errorCheck ? errorCheck : HIGH_AMOUNT_ERROR;
                    setError(error);
                  }
                }
              }

              setValue(newValue);
            }}
            onBlur={(e) => {
              const CleanValue = (value || "").split(",").join("");
              const fmtValue = formatDai(CleanValue).formatted;
              const buyAmount = getBuyAmount(amm, id, CleanValue);
              const errorCheck = checkErrors(fmtValue);
              const error = errorCheck ? errorCheck : !buyAmount ? HIGH_AMOUNT_ERROR : null;
              setError(error);
              setValue(fmtValue);

              if (Number(CleanValue) === 0) {
                updateBet({
                  ...bet,
                  wager: fmtValue,
                  toWin: null,
                });
              } else {
                let updatedToWin = toWin;
                if (!error && buyAmount) {
                  setUpdatedPrice(buyAmount?.price);
                  updatedToWin = formatDai(buyAmount?.maxProfit).formatted;
                }
                updateBet({
                  ...bet,
                  wagerAvgPrice: buyAmount?.price,
                  wager: fmtValue,
                  toWin: updatedToWin,
                });
              }
            }}
            isInvalid={!!error}
            value={value || ""}
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
  value = "",
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
      <input
        type="text"
        min={0}
        step={0.01}
        value={value}
        inputMode="numeric"
        pattern="\d*"
        placeholder=""
        onChange={onEdit}
        onBlur={onBlur}
        disabled={disabled}
        onKeyDown={(e) => {
          // stop passing values to onChange if they aren't valid keystrokes of // 0-9 | , | . | Backspace (for clearing input)
          const nums = /^(?:\d|\.|,)*$/;
          if (!nums.test(e.key) && !["Backspace", "Enter", "Delete", "ArrowLeft", "ArrowRight"].includes(e.key))
            e.preventDefault();
        }}
      />
    </div>
  );
};

const BetReciept = ({ tx_hash, bet }: { tx_hash: string; bet: ActiveBetType }) => {
  const { markets } = useDataStore();
  const {
    settings: { oddsFormat, timeFormat },
  } = useSportsStore();
  const {
    actions: { removeActive, updateActive },
  } = useBetslipStore();
  const {
    loginAccount,
    actions: { addTransaction },
  } = useUserStore();
  const { price, name, heading, isApproved, canCashOut, isPending, status } = bet;
  const market = markets[bet.marketId];
  const txStatus = {
    message: null,
    icon: PendingIcon,
    class: { [Styles.Pending]: true },
    action: () => console.log("nothing happens"),
  };

  switch (status) {
    case TX_STATUS.CONFIRMED: {
      txStatus.class = {
        [Styles.Confirmed]: true,
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
  const cashout = formatDai(bet.cashoutAmount).formatted;
  const buttonName = !canCashOut
    ? CASHOUT_NOT_AVAILABLE
    : !isApproved
    ? `APPROVE CASHOUT $${cashout}`
    : isPending
    ? `PENDING $${cashout}`
    : `CASHOUT: $${cashout}`;

  const isPositiveCashout = Number(bet.wager) < Number(cashout);
  const doApproveOrCashOut = async (loginAccount, bet, market) => {
    const txDetails = await approveOrCashOut(loginAccount, bet, market);
    if (txDetails?.hash) {
      addTransaction(txDetails);
      updateActive({ ...bet, hash: txDetails.hash }, true);
    }
  };

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
        <div
          className={classNames(Styles.Cashout, txStatus.class, {
            [Styles.Positive]: canCashOut && isPositiveCashout,
            [Styles.Negative]: canCashOut && !isPositiveCashout,
          })}
        >
          {isPending && <ReceiptLink hash={tx_hash} label="VIEW TX" icon />}
          <button disabled={isPending || !canCashOut} onClick={() => doApproveOrCashOut(loginAccount, bet, market)}>
            {buttonName}
          </button>
        </div>
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

export const TicketBreakdown = ({ bet, timeFormat }) => {
  const { wager, toWin, timestamp } = bet;
  return (
    <ul className={Styles.TicketBreakdown}>
      <li>
        <span>Wager</span>
        <DashlineNormal />
        <span>{`${wager === "0" ? "-" : formatCash(wager, USDC).full}`}</span>
      </li>
      <li>
        <span>To Win</span>
        <DashlineNormal />
        <span>{`${formatCash(toWin, USDC).full}`}</span>
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
    totalWager = totalWager.plus(bet?.wager?.split(",").join("") || "0");
    totalToWin = totalToWin.plus(bet?.toWin?.split(",").join(""));
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
    actions: { cancelAllBets, addActive, toggleSelectedView },
  } = useBetslipStore();
  const {
    actions: { setSidebar },
  } = useSportsStore();
  const { numApprovalsNeeded } = useUserApprovals();
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
  const isInvalid = totalToWin?.isNaN() || totalToWin?.eq(ZERO);
  return (
    <footer>
      {onBetslip ? (
        <>
          <p>
            You're betting <b>{formatDai(totalWager).full}</b> to win{" "}
            <b>{isInvalid ? "-" : formatDai(totalToWin).full}</b>
          </p>
          <SecondaryThemeButton text="Cancel All" icon={TrashIcon} reverseContent action={() => cancelAllBets()} />
          <PrimaryThemeButton
            text="Place Bets"
            disabled={isInvalid || numApprovalsNeeded > 0}
            action={async () => {
              for (const betId in bets) {
                const bet = bets[betId];
                const { amm } = markets[bet.marketId];
                const txDetails = await makeBet(loginAccount, amm, bet.id, bet.wager, account, amm.cash);
                if (txDetails.hash) {
                  const howManyBetsLeft = Object.keys(bets).length;
                  addActive({
                    ...bet,
                    betId,
                    ...txDetails,
                  });
                  if (howManyBetsLeft === 1) {
                    // last bet was just placed, toggle to active bets
                    toggleSelectedView();
                  }
                  addTransaction(txDetails);
                }
              }
            }}
          />
        </>
      ) : (
        <>
          <Link onClick={() => setSidebar(null)} to={makePath(PORTFOLIO)}>
            {SimpleChevron} View All Bets
          </Link>
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
