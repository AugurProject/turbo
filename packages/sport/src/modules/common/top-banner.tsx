import React from "react";
import Styles from "./top-banner.styles.less";
import { useAppStatusStore, useUserStore, ButtonComps, Constants } from "@augurproject/comps";
import { useSportsStore } from "../stores/sport";

const { PrimaryThemeButton, SecondaryThemeButton } = ButtonComps;

export const TopBanner = () => {
  const {
    actions: { setModal },
  } = useAppStatusStore();
  const { theme } = useSportsStore();
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
        invert={theme === 'SPORTS'}
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

export const NFLSideBanner = () => {
  const {
    actions: { updateMarketsViewSettings },
  } = useSportsStore();
  return (
    <article className={Styles.SideBannerNFL}>
      <h1>
        NFL
        <br />
        Season
      </h1>
      <SecondaryThemeButton
        text="Explore NFL Markets"
        action={() =>
          updateMarketsViewSettings({ primaryCategory: "sports", subCategories: ["american football", "nfl"] })
        }
      />
    </article>
  );
};
