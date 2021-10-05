import React, { useEffect, useState, useRef, useMemo } from "react";
import { useLocation } from "react-router";
import Styles from "./top-nav.styles.less";
import { Link } from "react-router-dom";
import classNames from "classnames";
import { useSportsStore } from "../stores/sport";
import {
  useAppStatusStore,
  useUserStore,
  Components,
  ConnectAccount as CompsConnectAccount,
  useLocalStorage,
  PathUtils,
  PARA_CONFIG,
  Constants,
  LinkLogo,
  Toasts,
  Formatter,
} from "@augurproject/comps";
import { useBetslipStore } from "../stores/betslip";
import { ACTIVE_BETS } from "../constants";
import { CategoriesArea } from "../categories/categories";
const {
  ButtonComps: { TinyThemeButton },
  LabelComps: { generateTooltip },
  Icons: { GearIcon, SharpThreeLinesIcon, SimpleCheck, XIcon },
  Links: { MarketsLink },
  SelectionComps: { ThemeSettingsLabel },
} = Components;
const { ConnectAccount } = CompsConnectAccount;
const { parsePath, makePath } = PathUtils;
const { formatCash } = Formatter;
const {
  MARKET,
  MARKETS,
  PORTFOLIO,
  SIDEBAR_TYPES,
  TWELVE_HOUR_TIME,
  USDC,
  TIME_TYPE,
  ODDS_TYPE,
  THEME_OPTIONS,
} = Constants;

const BETSIZE_ODDS_TO_DISPLAY_TIP = `The dollar amount shown under each odd represents the amount that can be taken at the odds shown. You can take greater than this amount, but it will impact the odds. To increase the amount, change the percentage. For example: 10% is displaying the odds you would receive if wanting to buy up to 10% of the available liquidity.`;

export const SettingsButton = () => {
  const {
    settings: { oddsFormat, timeFormat, betSizeToOdds, theme },
    actions: { updateSettings },
  } = useSportsStore();
  const { account } = useUserStore();
  const isPresetBetSizeOdds = [0.05, 0.1].includes(Number(betSizeToOdds));
  const [open, setOpened] = useState(false);
  const settingsRef = useRef(null);
  const customBetSizeInputRef = useRef(null);
  const [custom, setCustom] = useState(isPresetBetSizeOdds ? "" : String(Number(betSizeToOdds) * 100));
  const [customError, setCustomError] = useState(false);

  useEffect(() => {
    const handleWindowOnClick = (event) => {
      if (open && !!event.target && settingsRef.current !== null && !settingsRef?.current?.contains(event.target)) {
        setOpened(false);
      }
    };

    window.addEventListener("click", handleWindowOnClick);

    return () => {
      window.removeEventListener("click", handleWindowOnClick);
    };
  });

  useEffect(() => {
    const viewVersion = isPresetBetSizeOdds ? "" : String(Number(betSizeToOdds) * 100);
    const customTrimmed = custom.replace("%", "");
    if (customTrimmed !== viewVersion && account && customTrimmed === "") {
      setCustom(`${viewVersion}%`);
    }
  }, [account, betSizeToOdds]);

  return (
    <div className={classNames(Styles.SettingsMenuWrapper, { [Styles.Open]: open })}>
      <button onClick={() => setOpened(!open)}>{GearIcon}</button>
      {open && (
        <ul className={Styles.SettingsMenu} ref={settingsRef}>
          <li>
            <label htmlFor="timeFormat">Time Format</label>
            <ul id="timeFormat">
              <>
                {Object.entries(TIME_TYPE).map(([timeName, timeType]) => (
                  <li key={timeName}>
                    <button
                      className={classNames({ [Styles.Active]: timeType === timeFormat })}
                      onClick={() => timeType !== timeFormat && updateSettings({ timeFormat: timeType }, account)}
                    >
                      {timeType === TWELVE_HOUR_TIME ? "AM / PM" : "24hr"}
                      {SimpleCheck}
                    </button>
                  </li>
                ))}
              </>
            </ul>
          </li>
          <li>
            <label htmlFor="oddsFormat">Odds Format</label>
            <ul id="oddsFormat">
              <>
                {Object.keys(ODDS_TYPE).map((oddType) => (
                  <li key={oddType}>
                    <button
                      className={classNames({ [Styles.Active]: oddType === oddsFormat })}
                      onClick={() => oddType !== oddsFormat && updateSettings({ oddsFormat: oddType }, account)}
                    >
                      {oddType.toLowerCase()}
                      {SimpleCheck}
                    </button>
                  </li>
                ))}
              </>
            </ul>
          </li>
          <li>
            <label htmlFor="betSize">
              Bet Size to odds display
              {generateTooltip(BETSIZE_ODDS_TO_DISPLAY_TIP, "betsize-odds-tooltip")}
            </label>
            <div id="betSize">
              <TinyThemeButton
                customClass={{ [Styles.Active]: 0.05 === Number(betSizeToOdds) }}
                action={() => {
                  if (betSizeToOdds !== ".05") {
                    updateSettings({ betSizeToOdds: ".05" }, account);
                    setCustom("");
                    setCustomError(false);
                  }
                }}
                text="5%"
              />
              <TinyThemeButton
                customClass={{ [Styles.Active]: 0.1 === Number(betSizeToOdds) }}
                action={() => {
                  if (betSizeToOdds !== ".10") {
                    updateSettings({ betSizeToOdds: ".10" }, account);
                    setCustom("");
                    setCustomError(false);
                  }
                }}
                text="10%"
              />
              <input
                ref={customBetSizeInputRef}
                type="text"
                className={classNames(Styles.CustomBetSizeInput, {
                  [Styles.Active]: !isPresetBetSizeOdds && !customError,
                  [Styles.Error]: customError,
                })}
                value={custom}
                min={1}
                step={1}
                max={99}
                maxLength="2"
                inputMode="numeric"
                placeholder="Custom %"
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    customBetSizeInputRef?.current?.blur();
                  }
                }}
                onChange={(e) => {
                  const cleanNumber = Number(/^[0-9]*$/.exec(e.target.value.replace("%", ""))?.[0]);
                  if (cleanNumber < 100 && cleanNumber >= 1) {
                    updateSettings({ betSizeToOdds: String(cleanNumber / 100) }, account);
                    customError && setCustomError(false);
                  } else {
                    setCustomError(true);
                  }
                  setCustom(!isNaN(cleanNumber) ? `${String(cleanNumber)}` : custom);
                }}
                onBlur={(e) => {
                  if (!isPresetBetSizeOdds) {
                    if (customError) {
                      const oddsScaled = Number(betSizeToOdds) * 100;
                      setCustom(`${String(oddsScaled)}%`);
                      setCustomError(false);
                    } else {
                      setCustom(`${custom.replace("%", "")}%`);
                    }
                  } else if (isPresetBetSizeOdds) {
                    setCustom("");
                    setCustomError(false);
                  }
                }}
              />
            </div>
          </li>
          <li>
            <ThemeSettingsLabel
              {...{
                theme,
                updateSettings,
                wrapperCustomClass: Styles.ThemeSelection,
                buttonCustomClass: Styles.Active,
              }}
            />
          </li>
        </ul>
      )}
    </div>
  );
};

export const TopNav = () => {
  const location = useLocation();
  const path = parsePath(location.pathname)[0];
  const { networkId } = PARA_CONFIG;
  const {
    isLogged,
    actions: { setModal },
  } = useAppStatusStore();
  const {
    sidebarType,
    settings: { theme },
    actions: { setSidebar },
  } = useSportsStore();
  const {
    account,
    loginAccount,
    transactions,
    balances,
    actions: { updateLoginAccount, logout },
  } = useUserStore();
  const {
    active,
    selectedView,
    actions: { toggleSelectedView },
  } = useBetslipStore();
  const [lastUser, setLastUser] = useLocalStorage("lastUser", null);

  useEffect(() => {
    const isMetaMask = loginAccount?.library?.provider?.isMetaMask;
    if (isMetaMask && account) {
      setLastUser(account);
    } else if (!loginAccount?.active) {
      setLastUser(null);
    }
  }, [loginAccount]);

  const autoLogin = lastUser || null;

  const handleAccountUpdate = async (activeWeb3) => {
    if (activeWeb3) {
      if (String(networkId) !== String(activeWeb3.chainId)) {
        updateLoginAccount({ chainId: activeWeb3.chainId });
      } else if (account && account !== activeWeb3.account) {
        logout();
        updateLoginAccount(activeWeb3);
      } else {
        updateLoginAccount(activeWeb3);
      }
    }
  };

  const usdValueUSDC = useMemo(
    () =>
      formatCash(balances?.USDC?.usdValue || 0, USDC, {
        bigUnitPostfix: true,
      }).full,
    [balances?.USDC?.usdValue]
  );

  const activeBetDisplay = useMemo(() => {
    const amount = Object.keys(active).length;
    return amount > 1 ? (amount > 99 ? "99+" : amount) : null;
  }, [Object.keys(active).length]);
  return (
    <section
      className={classNames(Styles.TopNav, {
        [Styles.OnMarketsView]: path === MARKET,
      })}
    >
      <section>
        <LinkLogo />
        <ol>
          <li className={classNames({ [Styles.Active]: path === MARKETS })}>
            <Link placeholder="Markets" to={makePath(MARKETS)}>
              Markets
            </Link>
          </li>
          <li className={classNames({ [Styles.Active]: path === PORTFOLIO })}>
            <Link
              onClick={(e) => {
                !isLogged && e.preventDefault();
              }}
              disabled={!isLogged}
              to={makePath(PORTFOLIO)}
              placeholder={isLogged ? "My Bets" : "Please Login to view your bets"}
            >
              My Bets
            </Link>
          </li>
        </ol>
      </section>
      <section>
        <div>
          {isLogged && <span>{usdValueUSDC}</span>}
          <ConnectAccount
            {...{
              updateLoginAccount: handleAccountUpdate,
              autoLogin,
              transactions,
              setModal,
              customClassForModal: {
                [Styles.SportsAccountDetails]: true,
              },
              isMobile: false,
              buttonOptions: {
                invert: theme !== THEME_OPTIONS.DARK,
              },
            }}
          />
        </div>
        <SettingsButton />
      </section>
      <article>
        <MarketsLink id="mobile-logo-link">
          <svg width="22" height="24" viewBox="0 0 22 24">
            <path
              d="M4.02894 10.428L5.53694 11.394C5.67894 11.484 5.86694 11.44 5.95294 11.296L10.8229 3.152C10.8809 3.056 11.0209 3.056 11.0789 3.152L15.9489 11.296C16.0349 11.44 16.2249 11.484 16.3649 11.394L17.8729 10.428C18.0089 10.342 18.0509 10.162 17.9689 10.024L12.1489 0.29C12.0409 0.11 11.8469 0 11.6369 0H10.2649C10.0549 0 9.86094 0.11 9.75294 0.29L3.93294 10.024C3.85094 10.162 3.89294 10.342 4.02894 10.428Z"
              fill="#2AE7A8"
            />
            <path
              d="M21.8171 16.4621L19.4991 12.5861C19.4131 12.4421 19.2231 12.3981 19.0831 12.4881L17.5751 13.4541C17.4391 13.5401 17.3971 13.7201 17.4791 13.8581L18.8031 16.0721C18.8451 16.1421 18.8231 16.2301 18.7551 16.2741L11.0311 21.2241C10.9811 21.2561 10.9191 21.2561 10.8711 21.2241L3.14709 16.2741C3.07909 16.2301 3.05909 16.1401 3.09909 16.0721L4.42309 13.8581C4.50509 13.7201 4.46309 13.5401 4.32709 13.4541L2.81909 12.4881C2.67709 12.3981 2.48909 12.4421 2.40309 12.5861L0.0850897 16.4621C-0.0809103 16.7381 0.00308974 17.0961 0.27509 17.2701L10.6291 23.9061C10.8251 24.0321 11.0771 24.0321 11.2731 23.9061L21.6271 17.2701C21.8971 17.0961 21.9811 16.7381 21.8171 16.4621Z"
              fill="white"
            />
          </svg>
        </MarketsLink>
        <button
          onClick={() => {
            selectedView !== ACTIVE_BETS && toggleSelectedView();
            setSidebar(sidebarType === SIDEBAR_TYPES.BETSLIP ? null : SIDEBAR_TYPES.BETSLIP);
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20">
            <g clipPath="url(#clip0)">
              <path
                d="M2.72295 10.12L10.1198 2.72309C10.9447 3.11956 11.9124 3.11956 12.7373 2.72309L17.2771 7.26284C16.8806 8.08772 16.8806 9.05542 17.2771 9.8803L9.88016 17.2772C9.05528 16.8807 8.08758 16.8807 7.2627 17.2772L2.72295 12.7374C3.11942 11.9126 3.11942 10.9449 2.72295 10.12Z"
                stroke="white"
                strokeWidth="2"
              />
              <path d="M14.8811 11.6666L8.3335 5.4165" stroke="white" strokeWidth="2" />
            </g>
            <defs>
              <clipPath id="clip0">
                <rect width="20" height="20" fill="white" />
              </clipPath>
            </defs>
          </svg>
          {activeBetDisplay && <p>{activeBetDisplay}</p>}
        </button>
        <ConnectAccount
          {...{
            updateLoginAccount: handleAccountUpdate,
            autoLogin,
            transactions,
            setModal,
            isMobile: true,
            customClassForModal: {
              [Styles.SportsAccountDetails]: true,
            },
            buttonOptions: {
              invert: theme !== THEME_OPTIONS.DARK,
              small: true,
            },
          }}
        />
        <button
          className={Styles.MobileMenuButton}
          title="Augur Settings Menu"
          aria-label="Settings"
          onClick={() => {
            setSidebar(SIDEBAR_TYPES.NAVIGATION);
          }}
        >
          {SharpThreeLinesIcon}
        </button>
        <MobileMenu />
      </article>
      <Toasts />
    </section>
  );
};

const MobileMenu = () => {
  const { isLogged } = useAppStatusStore();
  const {
    filteredEvents,
    sidebarType,
    actions: { setSidebar },
  } = useSportsStore();
  const location = useLocation();
  const path = parsePath(location.pathname)[0];
  const closeSidebar = () => setSidebar(null);
  return (
    <section className={classNames(Styles.MobileMenu, { [Styles.Open]: sidebarType === SIDEBAR_TYPES.NAVIGATION })}>
      <header>
        <LinkLogo alwaysFull />
        <button onClick={closeSidebar}>{XIcon}</button>
      </header>
      <main>
        <ol>
          <li className={classNames({ [Styles.Active]: path === MARKETS })}>
            <Link onClick={sidebarType && closeSidebar} placeholder="Markets" to={makePath(MARKETS)}>
              Markets
            </Link>
          </li>
          <li className={classNames({ [Styles.Active]: path === PORTFOLIO })}>
            <Link
              onClick={(e) => {
                !isLogged && e.preventDefault();
                sidebarType && closeSidebar();
              }}
              disabled={!isLogged}
              to={makePath(PORTFOLIO)}
              placeholder={isLogged ? "My Bets" : "Please Login to view your bets"}
            >
              My Bets
            </Link>
          </li>
        </ol>
        {(path === MARKETS || path === PORTFOLIO) && <CategoriesArea inverted filteredMarkets={filteredEvents} onCounterClick={closeSidebar} />}
      </main>
      <footer>
        <SettingsButton />
      </footer>
    </section>
  );
};

export default TopNav;
