import React, { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router";
import Styles from "./top-nav.styles.less";
import { Link } from "react-router-dom";
import classNames from "classnames";
import { useSimplifiedStore } from "../stores/simplified";
import {
  useAppStatusStore,
  useUserStore,
  useLocalStorage,
  PathUtils,
  PARA_CONFIG,
  Constants,
  Components,
} from "@augurproject/comps";
const { parsePath, makePath } = PathUtils;
const { MARKET, MARKETS, PORTFOLIO, LIQUIDITY, SIDEBAR_TYPES, TWELVE_HOUR_TIME, TWENTY_FOUR_HOUR_TIME } = Constants;
const {
  Toasts,
  LinkLogo,
  ConnectAccount: { ConnectAccount },
  Icons: { GearIcon, ThreeLinesIcon },
  SelectionComps: { ToggleSwitch },
  ButtonComps: { SecondaryThemeButton },
} = Components;

export const SettingsButton = () => {
  const {
    settings: { showResolvedPositions, showLiquidMarkets, timeFormat },
    actions: { updateSettings },
  } = useSimplifiedStore();
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
    <div className={Styles.SettingsMenuWrapper}>
      <SecondaryThemeButton title="Settings" action={() => setOpened(!open)} icon={GearIcon} />
      {open && (
        <ul className={Styles.SettingsMenu} ref={settingsRef}>
          <li>
            <h2>Settings</h2>
          </li>
          <li>
            <label htmlFor="showLiquidMarkets">Show liquid markets only</label>
            <ToggleSwitch
              id="showLiquidMarkets"
              toggle={showLiquidMarkets}
              setToggle={() => updateSettings({ showLiquidMarkets: !showLiquidMarkets }, account)}
            />
          </li>
          <li>
            <label htmlFor="showResolvedPositions">Show resolved positions in portfolio</label>
            <ToggleSwitch
              id="showResolvedPositions"
              toggle={showResolvedPositions}
              setToggle={() => updateSettings({ showResolvedPositions: !showResolvedPositions }, account)}
            />
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
  } = useSimplifiedStore();
  const {
    account,
    loginAccount,
    transactions,
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

  return (
    <section
      className={classNames(Styles.TopNav, {
        [Styles.TwoTone]: path !== MARKETS && path !== LIQUIDITY,
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
                placeholder={isLogged ? "Portfolio" : "Please Login to view Portfolio"}
              >
                Portfolio
              </Link>
            </li>
            <li className={classNames({ [Styles.Active]: path === LIQUIDITY })}>
              <Link to={makePath(LIQUIDITY)} placeholder="Liquidity">
                Liquidity
              </Link>
            </li>
          </ol>
        )}
      </section>
      <section>
        <ConnectAccount
          {...{
            updateLoginAccount: handleAccountUpdate,
            autoLogin,
            transactions,
            setModal,
            isMobile,
            buttonOptions: {
              reverseContent: true,
            },
          }}
        />
        {isMobile ? (
          <button
            className={Styles.MobileMenuButton}
            title="Augur Settings Menu"
            aria-label="Settings"
            onClick={() => setSidebar(SIDEBAR_TYPES.NAVIGATION)}
          >
            {ThreeLinesIcon}
          </button>
        ) : (
          <SettingsButton />
        )}
        <Toasts />
      </section>
    </section>
  );
};

export default TopNav;
