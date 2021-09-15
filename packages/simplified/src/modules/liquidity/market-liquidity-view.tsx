import React from "react";
import classNames from "classnames";
import Styles from "./market-liquidity-view.styles.less";

import { useHistory, useLocation } from "react-router";
import { useDataStore, Components, Utils, Constants } from "@augurproject/comps";
import { useSimplifiedStore } from "modules/stores/simplified";
import { LIQUIDITY, MARKET_LIQUIDITY, ADD, REMOVE } from "../constants";
const {
  LabelComps: { CategoryIcon },
  MarketCardComps: { MarketTitleArea },
  Links: { MarketLink },
  Icons: { WarningIcon, BackIcon },
} = Components;
const {
  PathUtils: { makePath, parseQuery },
} = Utils;
const { MARKET_ID_PARAM_NAME } = Constants;

export const MarketLiquidityView = () => {
  const {
    settings: { timeFormat },
  } = useSimplifiedStore();
  const location = useLocation();
  const { [MARKET_ID_PARAM_NAME]: marketId, [MARKET_LIQUIDITY]: actionType } = parseQuery(location.search);
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
      <LiquidityForm actionType={actionType} />
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

const LiquidityForm = ({ actionType = ADD }) => {
  const history = useHistory();
  const title = actionType === REMOVE ? "Remove Liquidity" : "Add Liquidity";
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
      <main>testing</main>
    </section>
  );
};
export default MarketLiquidityView;
