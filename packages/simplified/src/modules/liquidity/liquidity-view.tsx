import React from "react";
import Styles from "./liquidity-view.styles.less";
import { AppViewStats, AvailableLiquidityRewards } from "../common/labels";

const LiquidityView = () => (
  <div className={Styles.LiquidityView}>
    <AppViewStats small liquidity />
    <AvailableLiquidityRewards />
  </div>
);

export default LiquidityView;
