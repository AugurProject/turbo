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
    </div>
  );
};

export default MarketLiquidityView;
