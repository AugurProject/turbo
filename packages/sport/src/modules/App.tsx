import React, { useEffect } from "react";
import { useLocation } from "react-router";
import { HashRouter } from "react-router-dom";
import Styles from "./App.styles.less";
import Routes from "./routes/routes";
import TopNav from "./common/top-nav";
import "../assets/styles/shared.less";
import { SportProvider, useSportsStore } from "./stores/sport";
import classNames from "classnames";
import ModalView from "./modal/modal-view";
import {
  Stores,
  useDataStore,
  useAppStatusStore,
  useFinalizeUserTransactions,
  useUserBalances,
  PathUtils,
  Constants,
  windowRef,
} from "@augurproject/comps";
import { Betslip } from "./betslip/betslip";
import { BetslipProvider } from './stores/betslip';
import { SportsFooter } from './common/sports-footer';

const { PORTFOLIO, MARKET_LOAD_TYPE } = Constants;
const { parsePath } = PathUtils;

const AppBody = () => {
  const { markets, cashes, ammExchanges, blocknumber, transactions } = useDataStore();
  const {
    modal,
  } = useAppStatusStore();
  const { sidebarType } = useSportsStore();
  const modalShowing = Object.keys(modal).length !== 0;
  const location = useLocation();
  const path = parsePath(location.pathname)[0];

  useUserBalances({ ammExchanges, blocknumber, cashes, markets, transactions });
  useFinalizeUserTransactions(blocknumber);
  
  useEffect(() => {
    const html: any = windowRef.document.firstElementChild;
    const isHeightUnset = html?.style?.height === "";
    const eitherOr = modalShowing;
    if (eitherOr && isHeightUnset) {
      html.style.height = "100%";
      html.style.overflow = "hidden";
    } else if (!eitherOr && !isHeightUnset) {
      html.style.height = "";
      html.style.overflow = "";
    }
  }, [modalShowing]);

  return (
    <div
      id="mainContent"
      className={classNames(Styles.App, {
        [Styles.ModalShowing]: modalShowing,
        [Styles.BetslipShowing]: sidebarType !== null,
        [Styles.MyBets]: path === PORTFOLIO
      })}
    >
      {modalShowing && <ModalView />}
      <TopNav />
      <main>
        <Routes />
        <Betslip />
      </main>
      <SportsFooter />
    </div>
  );
};
function App() {
  const {
    AppStatus: { AppStatusProvider },
    ConnectAccount: { ConnectAccountProvider },
    Data: { DataProvider },
    User: { UserProvider },
  } = Stores;
  return (
    <HashRouter hashType="hashbang">
      <ConnectAccountProvider>
        <UserProvider>
          <DataProvider loadType={MARKET_LOAD_TYPE.SPORT}>
            <AppStatusProvider>
              <SportProvider>
                <BetslipProvider>
                  <AppBody />
                </BetslipProvider>
              </SportProvider>
            </AppStatusProvider>
          </DataProvider>
        </UserProvider>
      </ConnectAccountProvider>
    </HashRouter>
  );
}

export default App;
