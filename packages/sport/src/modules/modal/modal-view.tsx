import React, { useEffect, useState, useRef } from "react";
import { ModalRules } from "./modal-rules";
import { useHistory } from "react-router";
import Styles from "./modal.styles.less";
import { MODAL_ADD_LIQUIDITY, TURBO_NO_ACCESS_MODAL, MODAL_EVENT_RULES } from "../constants";
import { Constants, Modals, useUserStore, useAppStatusStore } from "@augurproject/comps";
const { ModalConnectWallet } = Modals;

function selectModal(type, modal, logout, closeModal, removeTransaction, isLogged, isMobile) {
  switch (type) {
    case TURBO_NO_ACCESS_MODAL:
      return (
        <section className={Styles.ModalView}>
          <div className={Styles.FooterText}>Matic/Mainnet access is disabled for https://turbo.augur.sh</div>
        </section>
      );
    case MODAL_ADD_LIQUIDITY:
      return <div />;
    case MODAL_EVENT_RULES:
      return <ModalRules {...modal} />;
    case Constants.MODAL_CONNECT_WALLET:
      return (
        <ModalConnectWallet
          {...modal}
          logout={logout}
          closeModal={closeModal}
          isLogged={isLogged}
          isMobile={isMobile}
          removeTransaction={removeTransaction}
        />
      );
    default:
      return <div />;
  }
}

const ESCAPE_KEYCODE = 27;

const ModalView = () => {
  const history = useHistory();
  const modalRef = useRef(null);
  const {
    modal,
    isLogged,
    isMobile,
    actions: { closeModal },
  } = useAppStatusStore();
  const {
    actions: { logout, removeTransaction },
  } = useUserStore();
  const [locationKeys, setLocationKeys]: [any[], Function] = useState([]);

  const handleKeyDown = (e) => {
    if (e.keyCode === ESCAPE_KEYCODE) {
      // @ts-ignore
      if (modal && modal.cb) {
        // @ts-ignore
        modal.cb();
      }
      closeModal();
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const handleWindowOnClick = (event) => {
      if (modal && !!event.target && modalRef?.current !== null && !modalRef?.current?.contains(event.target)) {
        closeModal();
      }
    };

    window.addEventListener("click", handleWindowOnClick);

    return () => {
      window.removeEventListener("click", handleWindowOnClick);
    };
  });

  useEffect(() => {
    return history.listen((location) => {
      if (history.action === "PUSH") {
        setLocationKeys([location.key]);
      }

      if (history.action === "POP") {
        if (locationKeys[1] === location.key) {
          setLocationKeys(([_, ...keys]) => keys);

          closeModal();
        } else {
          setLocationKeys((keys) => [location.key, ...keys]);

          closeModal();
        }
      }
    });
  }, [locationKeys]);

  const Modal = selectModal(modal.type, modal, logout, closeModal, removeTransaction, isLogged, isMobile);

  return (
    <section className={Styles.ModalView}>
      <div ref={modalRef}>{Modal}</div>
    </section>
  );
};

export default ModalView;
