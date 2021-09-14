import React from "react";
import classNames from "classnames";
import Styles from "./market-liquidity-view.styles.less";
import { useDataStore, Components } from "@augurproject/comps";
import { useMarketQueryId } from "modules/market/market-view";
import { useSimplifiedStore } from "modules/stores/simplified";
const {
  LabelComps: { CategoryIcon },
  MarketCardComps: { MarketTitleArea },
  Links: { MarketLink },
  Icons: { WarningIcon },
} = Components;
export const MarketLiquidityView = () => {
  const {
    settings: { timeFormat },
  } = useSimplifiedStore();
  const marketId = useMarketQueryId();
  const { markets } = useDataStore();
  const market = markets[marketId];
  const { categories } = market;

  return (
    <div className={classNames(Styles.MarketLiquidityView)}>
      <MarketLink id={marketId} dontGoToMarket={false}>
        <CategoryIcon {...{ categories }} />
        <MarketTitleArea {...{ ...market, timeFormat }} />
      </MarketLink>
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
export default MarketLiquidityView;
