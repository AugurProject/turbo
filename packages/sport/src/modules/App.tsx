import React, { useEffect } from "react";
import { useLocation } from "react-router";
import { HashRouter } from "react-router-dom";
import Styles from "./App.styles.less";
import Routes from "./routes/routes";
import TopNav from "./common/top-nav";
import "../assets/styles/shared.less";
import { SportProvider, useSportsStore } from "./stores/sport";
// import { Sidebar } from "./sidebar/sidebar";
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
  ButtonComps,
  useUserStore,
} from "@augurproject/comps";
import { TURBO_NO_ACCESS_MODAL } from "./constants";
import { Betslip } from "./betslip/betslip";
// import { useActiveWeb3React } from "@augurproject/comps/build/components/ConnectAccount/hooks";
const { PORTFOLIO } = Constants;
const { parsePath } = PathUtils;
const { PrimaryButton } = ButtonComps;

// // const AppBody = () => {
//   const { markets, cashes, ammExchanges, blocknumber, transactions } = useDataStore();
//   const { isMobile, modal, actions: { setModal }, } = useAppStatusStore();
//   const { sidebarType, showTradingForm } = useSportsStore();
//   const { loginAccount, actions: { logout }, } = useUserStore();
//   const modalShowing = Object.keys(modal).length !== 0;
  // const location = useLocation();
  // const path = parsePath(location.pathname)[0];
//   const sidebarOut = sidebarType && isMobile;

  // useUserBalances({ ammExchanges, blocknumber, cashes, markets, transactions });
  // useFinalizeUserTransactions(blocknumber);
  // const activeWeb3 = useActiveWeb3React();

//   useEffect(() => {
//     const isTurboOrigin = () => window.location.origin.indexOf('turbo.augur.sh') > 0;
//     if (!!loginAccount && isTurboOrigin()) {
//       const isMainnetOrMatic = () => {
//                 // "1" 	  Mainnet             // "137" 	Matic Mainnet
//         return (loginAccount.chainId === 1 || loginAccount.chainId === 137);
//       }
//       if (modal.type !== TURBO_NO_ACCESS_MODAL && isMainnetOrMatic()) {
//         logout();
//         activeWeb3.deactivate();
//         setModal({
//           type: TURBO_NO_ACCESS_MODAL,
//         });
//       }
//     }
//   }, [loginAccount]);

//   useEffect(() => {
//     const html = windowRef.document.firstElementChild;
//     // @ts-ignore
//     const isHeightUnset = html?.style?.height === "";
//     const eitherOr = modalShowing || showTradingForm;
//     if (eitherOr && isHeightUnset) {
//       // @ts-ignore
//       html.style.height = "100%";
//       // @ts-ignore
//       html.style.overflow = "hidden";
//     } else if (!eitherOr && !isHeightUnset) {
//       // @ts-ignore
//       html.style.height = "";
//       // @ts-ignore
//       html.style.overflow = "";
//     }
//   }, [modalShowing, showTradingForm]);

//   return (
//     <div
//       id="mainContent"
//       className={classNames(Styles.App, {
//         [Styles.SidebarOut]: sidebarOut,
//         [Styles.TwoToneContent]: path !== MARKETS,
//         [Styles.ModalShowing]: modalShowing || showTradingForm,
//       })}
//     >
//       {modalShowing && <ModalView />}
//       {sidebarOut && <Sidebar />}
//       <TopNav />
//       <Routes />
//     </div>
//   );
// };

const AppBody = () => {
  const { markets, cashes, ammExchanges, blocknumber, transactions } = useDataStore();
  const {
    isMobile,
    modal,
    actions: { setModal },
  } = useAppStatusStore();
  const {
    loginAccount,
    actions: { logout },
  } = useUserStore();
  const modalShowing = Object.keys(modal).length !== 0;
  const location = useLocation();
  const path = parsePath(location.pathname)[0];

  useUserBalances({ ammExchanges, blocknumber, cashes, markets, transactions });
  useFinalizeUserTransactions(blocknumber);
  
  useEffect(() => {
    const html = windowRef.document.firstElementChild;
    // @ts-ignore
    const isHeightUnset = html?.style?.height === "";
    const eitherOr = modalShowing;
    if (eitherOr && isHeightUnset) {
      // @ts-ignore
      html.style.height = "100%";
      // @ts-ignore
      html.style.overflow = "hidden";
    } else if (!eitherOr && !isHeightUnset) {
      // @ts-ignore
      html.style.height = "";
      // @ts-ignore
      html.style.overflow = "";
    }
  }, [modalShowing]);

  return (
    <div
      id="mainContent"
      className={classNames(Styles.App, {
        [Styles.ModalShowing]: modalShowing,
        [Styles.MyBets]: path === PORTFOLIO
      })}
    >
      {modalShowing && <ModalView />}
      <TopNav />
      <Routes />
      <Betslip />
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
          <DataProvider>
            <AppStatusProvider>
              <SportProvider>
                <AppBody />
              </SportProvider>
            </AppStatusProvider>
          </DataProvider>
        </UserProvider>
      </ConnectAccountProvider>
    </HashRouter>
  );
}

export default App;
