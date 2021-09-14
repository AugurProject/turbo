import React from "react";
import classNames from "classnames";
import Styles from "./market-liquidity-view.styles.less";

import { useHistory } from "react-router";
import { useDataStore, Components, Utils } from "@augurproject/comps";
import { useMarketQueryId } from "modules/market/market-view";
import { useSimplifiedStore } from "modules/stores/simplified";
import { LIQUIDITY } from "../constants";
const {
  LabelComps: { CategoryIcon },
  MarketCardComps: { MarketTitleArea },
  Links: { MarketLink },
  Icons: { WarningIcon, BackIcon },
} = Components;
const {
  PathUtils: { makePath },
} = Utils;

export const MarketLiquidityView = () => {
  const {
    settings: { timeFormat },
  } = useSimplifiedStore();
  const marketId = useMarketQueryId();
  const { markets } = useDataStore();
  const market = markets?.[marketId];

  if (!market) {
    return <div className={classNames(Styles.MarketLiquidityView)}>Market Not Found.</div>;
  }
  const { categories } = market;
  return (
    <div className={classNames(Styles.MarketLiquidityView)}>
      <MarketLink id={marketId} dontGoToMarket={false}>
        <CategoryIcon {...{ categories }} />
        <MarketTitleArea {...{ ...market, timeFormat }} />
      </MarketLink>
      <LiquidityForm />
      <LiquidityWarningFooter />
    </div>
  );
};

const LiquidityWarningFooter = () => (
  <article className={Styles.LiquidityWarningFooter}>
    <p>
      By adding liquidity you'll earn 1.50% of all trades on this market proportional to your share of the pool. Fees
      are added to the pool, accrue in real time and can be claimed by withdrawing your liquidity.
    </p>
    <span>{WarningIcon} Remove liquidity before the winning outcome is known to prevent any loss of funds</span>
  </article>
);

const LiquidityForm = () => {
  const history = useHistory();
  const title = "Add Liquidity";
  return (
    <section className={Styles.LiquidityForm}>
      <header>
        <button
          onClick={() =>
            history.push({
              pathname: makePath(LIQUIDITY),
            })
          }
        >
          {BackIcon}
        </button>
        {title}
      </header>
    </section>
  );
};
export default MarketLiquidityView;
