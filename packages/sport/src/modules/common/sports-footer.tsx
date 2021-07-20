import React from "react";
import classNames from "classnames";
import Styles from "./sports-footer.styles.less";
import { Links, LabelComps, Constants } from "@augurproject/comps";
import { useSportsStore } from "../stores/sport";

const { ExternalLink } = Links;
const { VersionLabel } = LabelComps;
const { SIDEBAR_TYPES } = Constants;

export const SportsFooter = () => {
  const { sidebarType } = useSportsStore();
  return (
    <footer
      className={classNames(Styles.SportsFooter, {
        [Styles.BetslipOpen]: sidebarType === SIDEBAR_TYPES.BETSLIP,
      })}
    >
      <span>Augur UI:</span>
      <VersionLabel />
      <ExternalLink label="Augur.net" URL="https://www.augur.net/" />
      <ExternalLink label="Help Docs" URL="https://help.augur.net" />
      <ExternalLink label="Discord" URL="https://invite.augur.net/" />
    </footer>
  );
};
