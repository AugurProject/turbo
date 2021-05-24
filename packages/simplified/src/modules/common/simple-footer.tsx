import React from "react";
import Styles from "./simple-footer.styles.less";
import { Logo, LabelComps } from "@augurproject/comps";
import { ExternalLink } from "@augurproject/comps/build/utils/links/links";
const { VersionLabel } = LabelComps;

export const SimpleFooter = () => (
  <footer className={Styles.SimpleFooter}>
    <div>
      <Logo isMobile />
      <ExternalLink label="Augur.net" URL="https://www.augur.net/" />
      <ExternalLink label="Help Docs" URL="https://help.augur.net" />
      <ExternalLink label="Discord" URL="https://invite.augur.net/" />
      <VersionLabel />
    </div>
    <div />
  </footer>
);
