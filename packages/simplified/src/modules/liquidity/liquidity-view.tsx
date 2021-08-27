import React, { useState } from "react";
import Styles from "./liquidity-view.styles.less";
import { Components } from "@augurproject/comps";
import { categoryItems } from "../constants";
import { AppViewStats, AvailableLiquidityRewards } from "../common/labels";
import { useSimplifiedStore } from "../stores/simplified";

const {
  SelectionComps: { SquareDropdown },
  InputComps: { SearchInput },
} = Components;

const LiquidityView = () => {
  const {
    marketsViewSettings,
    actions: { updateMarketsViewSettings },
  } = useSimplifiedStore();
  const [filter, setFilter] = useState("");
  const { primaryCategory } = marketsViewSettings;
  return (
    <div className={Styles.LiquidityView}>
      <AppViewStats small liquidity />
      <AvailableLiquidityRewards />
      <h1>Explore LP Opportunties</h1>
      <p>
        Add Market liquidity to earn fees and rewards. <a href="#">Learn more →</a>
      </p>
      <ul>
        <SquareDropdown
          onChange={(value) => {
            updateMarketsViewSettings({ primaryCategory: value, subCategories: [] });
          }}
          options={categoryItems}
          defaultValue={primaryCategory}
        />
        <SquareDropdown
        onChange={() => {}} options={[
          {
            label: 'Daily + Long Term',
            value: 'daily+long',
            disabled: false,
          },
          {
            label: 'Daily Only',
            value: 'daily',
            disabled: false,
          },
          {
            label: 'Long Term Only',
            value: 'long',
            disabled: false,
          }
        ]} defaultValue={'daily+long'} />
        <span>My Liquidity Positions</span>
        <SearchInput
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          clearValue={() => setFilter("")}
          showFilter={true}
        />
      </ul>
    </div>
  );
};

export default LiquidityView;
