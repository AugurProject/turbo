import React, { useEffect, useState, useRef, useMemo } from "react";
import { useLocation } from "react-router";
import Styles from "./top-nav.styles.less";
import { Link } from "react-router-dom";
import classNames from "classnames";
//import { Toasts } from "../toasts/toasts";
import { useSportsStore } from "../stores/sport";
import {
  Icons,
  useAppStatusStore,
  useUserStore,
  ConnectAccount as CompsConnectAccount,
  useLocalStorage,
  ButtonComps,
  PathUtils,
  PARA_CONFIG,
  Constants,
  LinkLogo,
  Formatter,
  Components,
} from "@augurproject/comps";
const { GearIcon, ThreeLinesIcon } = Icons;
const { ConnectAccount } = CompsConnectAccount;
const { SecondaryButton } = ButtonComps;
const { parsePath, makePath } = PathUtils;
const { formatCash } = Formatter;
const { MARKET, MARKETS, PORTFOLIO, SIDEBAR_TYPES, TWELVE_HOUR_TIME, TWENTY_FOUR_HOUR_TIME, USDC } = Constants;
const { ToggleSwitch } = Components;

export const SettingsButton = () => {
  const {
    settings: { oddsFormat, timeFormat },
    actions: { updateSettings },
  } = useSportsStore();
  const { account } = useUserStore();
  const [open, setOpened] = useState(false);
  const settingsRef = useRef(null);
  const is24hour = timeFormat === TWENTY_FOUR_HOUR_TIME;
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
            <h2>Settings</h2>
          </li>
          <li>
            <label htmlFor="switchTime">Display time in 24hr format</label>
            <ToggleSwitch
              id="switchTime"
              toggle={is24hour}
              setToggle={() => 
                updateSettings({ timeFormat: is24hour ? TWELVE_HOUR_TIME : TWENTY_FOUR_HOUR_TIME }, account)
              }
            />
          </li>
          <li>
            <label htmlFor="oddsFormat">Odds Format</label>
            <ToggleSwitch
              id="oddsFormat"
              toggle={oddsFormat}
              setToggle={() => 
                updateSettings({ oddsFormat: Constants.ODDS_TYPE.DECIMAL }, account)
              }
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

  const usdValueUSDC = useMemo(() => formatCash(balances?.USDC?.usdValue || 0, USDC, {
    bigUnitPostfix: true,
  }).full, [balances?.USDC?.usdValue]);

  return (
    <section
      className={classNames(Styles.TopNav, {
        [Styles.OnMarketsView]: path === MARKET,
      })}
    >
      <section>
        <LinkLogo />
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
            onClick={() =>{ 
              setSidebar(SIDEBAR_TYPES.NAVIGATION)
            }}
          >
            {ThreeLinesIcon}
          </button>
        ) : (
          <SettingsButton />
        )}
      </section>
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
  );
};

export default TopNav;
