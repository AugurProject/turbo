import React, { useEffect, useState, useRef, useMemo } from "react";
import { useLocation } from "react-router";
import Styles from "./top-nav.styles.less";
import { Link } from "react-router-dom";
import classNames from "classnames";
import { useSportsStore } from "../stores/sport";
import {
  Icons,
  useAppStatusStore,
  useUserStore,
  ConnectAccount as CompsConnectAccount,
  useLocalStorage,
  PathUtils,
  PARA_CONFIG,
  Constants,
  LinkLogo,
  Formatter,
} from "@augurproject/comps";
const { GearIcon, ThreeLinesIcon, SimpleCheck } = Icons;
const { ConnectAccount } = CompsConnectAccount;
const { parsePath, makePath } = PathUtils;
const { formatCash } = Formatter;
const { MARKET, MARKETS, PORTFOLIO, SIDEBAR_TYPES, TWELVE_HOUR_TIME, USDC } = Constants;


export const SettingsButton = () => {
  const {
    settings: { oddsFormat, timeFormat },
    actions: { updateSettings },
  } = useSportsStore();
  const { account } = useUserStore();
  const [open, setOpened] = useState(false);
  const settingsRef = useRef(null);

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

  return (
    <div className={classNames(Styles.SettingsMenuWrapper, { [Styles.Open]: open })}>
      <button onClick={() => setOpened(!open)}>{GearIcon}</button>
      {open && (
        <ul className={Styles.SettingsMenu} ref={settingsRef}>
          <li>
            <label htmlFor="timeFormat">Time Format</label>
            <ul className={Styles.OptionsSection} id="timeFormat">
              <>
                {Object.entries(Constants.TIME_TYPE).map(([timeName, timeType]) => (
                  <li>
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
            <ul className={Styles.OptionsSection} id="oddsFormat">
              <>
                {Object.keys(Constants.ODDS_TYPE).map((oddType) => (
                  <li>
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
            <label htmlFor="betSize">Bet Size to odds display</label>
            <div>
              <button onClick={() => {}}>5%</button>
              <button onClick={() => {}}>10%</button>
              <button onClick={() => {}}>15%</button>
            </div>
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
    isMobile,
    actions: { setModal },
  } = useAppStatusStore();
  const {
    actions: { setSidebar },
  } = useSportsStore();
  const {
    account,
    loginAccount,
    transactions,
    balances,
    actions: { updateLoginAccount, logout },
  } = useUserStore();
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

  return (
    <section
      className={classNames(Styles.TopNav, {
        [Styles.OnMarketsView]: path === MARKET,
      })}
    >
      <section>
        <LinkLogo />
        {!isMobile && (
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
        )}
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
              isMobile,
            }}
          />
        </div>
        {isMobile ? (
          <button
            className={Styles.MobileMenuButton}
            title="Augur Settings Menu"
            aria-label="Settings"
            onClick={() => {
              setSidebar(SIDEBAR_TYPES.NAVIGATION);
            }}
          >
            {ThreeLinesIcon}
          </button>
        ) : (
          <SettingsButton />
        )}
      </section>
    </section>
  );
};

export default TopNav;
