import React from "react";
import Styles from "./sports-footer.styles.less";
import { Links, LabelComps } from "@augurproject/comps";
const { ExternalLink } = Links;
const { VersionLabel } = LabelComps;

export const SportsFooter = () => (
  <footer className={Styles.SportsFooter}>
    <span>Augur UI:</span>
    <VersionLabel />
    <ExternalLink label="Augur.net" URL="https://www.augur.net/" />
    <ExternalLink label="Help Docs" URL="https://help.augur.net" />
    <ExternalLink label="Discord" URL="https://invite.augur.net/" />
  </footer>
);
