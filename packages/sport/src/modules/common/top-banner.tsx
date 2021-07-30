import React from "react";
import Styles from "./top-banner.styles.less";
import { useAppStatusStore, useUserStore, ButtonComps, Constants } from "@augurproject/comps";

const { PrimaryThemeButton } = ButtonComps;

export const TopBanner = () => {
  const {
    actions: { setModal },
  } = useAppStatusStore();
  const { transactions } = useUserStore();
  return (
    <div className={Styles.TopBanner}>
      <h1>
        Your global no-limit
        <br />
        betting platform.
      </h1>
      <PrimaryThemeButton
        text="Connect a wallet to start betting"
        invert
        action={() =>
          setModal({
            type: Constants.MODAL_CONNECT_WALLET,
            darkMode: false,
            autoLogin: false,
            transactions,
          })
        }
      />
    </div>
  );
};
