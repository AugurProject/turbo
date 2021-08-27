import React, { useState } from "react";
import Styles from "./liquidity-view.styles.less";
import { Components } from "@augurproject/comps";
import { categoryItems } from "../constants";
import { AppViewStats, AvailableLiquidityRewards } from "../common/labels";
import { useSimplifiedStore } from "../stores/simplified";
const {
  SelectionComps: { SquareDropdown },
  InputComps: { SearchInput },
  ButtonComps: { PrimaryThemeButton },
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
        Add Market liquidity to earn fees and rewards. <a href='.'>Learn more →</a>
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
          onChange={() => {}}
          options={[
            {
              label: "Daily + Long Term",
              value: "daily+long",
              disabled: false,
            },
            {
              label: "Daily Only",
              value: "daily",
              disabled: false,
            },
            {
              label: "Long Term Only",
              value: "long",
              disabled: false,
            },
          ]}
          defaultValue={"daily+long"}
        />
        <span>My Liquidity Positions</span>
        <SearchInput
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          clearValue={() => setFilter("")}
          showFilter={true}
        />
      </ul>
      <section>
        <article>
          <span>Market</span>
          <button>Expires</button>
          <button>TVL</button>
          <button>APR</button>
          <button>My Liquidity</button>
          <button>My Rewards</button>
          <span />
        </article>
        <section>
          <article>
            <div>icon title, est start</div>
            <span>04/09/2022</span>
            <span>$385,000</span>
            <span>15.21%</span>
            <span>0</span>
            <span>0 MATIC</span>
            <PrimaryThemeButton text="ADD LIQUIDITY" small action={() => console.log("!")} />
          </article>
          <article>
            <div>icon title, est start</div>
            <span>04/09/2022</span>
            <span>$385,000</span>
            <span>15.21%</span>
            <span>0</span>
            <span>0 MATIC</span>
            <PrimaryThemeButton text="ADD LIQUIDITY" small action={() => console.log("!")} />
          </article>
          <article>
            <div>icon title, est start</div>
            <span>04/09/2022</span>
            <span>$385,000</span>
            <span>15.21%</span>
            <span>0</span>
            <span>0 MATIC</span>
            <PrimaryThemeButton text="ADD LIQUIDITY" small action={() => console.log("!")} />
          </article>
          <article>
            <div>icon title, est start</div>
            <span>04/09/2022</span>
            <span>$385,000</span>
            <span>15.21%</span>
            <span>0</span>
            <span>0 MATIC</span>
            <PrimaryThemeButton text="ADD LIQUIDITY" small action={() => console.log("!")} />
          </article>
          <article>
            <div>icon title, est start</div>
            <span>04/09/2022</span>
            <span>$385,000</span>
            <span>15.21%</span>
            <span>0</span>
            <span>0 MATIC</span>
            <PrimaryThemeButton text="ADD LIQUIDITY" small action={() => console.log("!")} />
          </article>
          <article>
            <div>icon title, est start</div>
            <span>04/09/2022</span>
            <span>$385,000</span>
            <span>15.21%</span>
            <span>0</span>
            <span>0 MATIC</span>
            <PrimaryThemeButton text="ADD LIQUIDITY" small action={() => console.log("!")} />
          </article>
        </section>
      </section>
    </div>
  );
};

export default LiquidityView;
