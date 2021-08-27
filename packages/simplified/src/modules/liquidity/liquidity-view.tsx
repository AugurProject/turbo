import React from "react";
import Styles from "./liquidity-view.styles.less";
import { AppViewStats } from "../common/labels";

const LiquidityView = () => (
  <div className={Styles.LiquidityView}>
    <AppViewStats small liquidity />
  </div>
);

export default LiquidityView;
