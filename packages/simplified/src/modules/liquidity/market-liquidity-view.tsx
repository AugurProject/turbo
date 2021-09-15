import React, { useState } from "react";
import classNames from "classnames";
import Styles from "./market-liquidity-view.styles.less";

import { useHistory, useLocation } from "react-router";
import { useDataStore, useUserStore, Components, Utils, Constants } from "@augurproject/comps";
import { MarketInfo, Cash, LiquidityBreakdown, DataState } from "@augurproject/comps/build/types";
import { useSimplifiedStore } from "modules/stores/simplified";
import { LIQUIDITY, MARKET_LIQUIDITY, ADD, REMOVE, SHARES, USDC } from "../constants";
const {
  LabelComps: { CategoryIcon },
  MarketCardComps: { MarketTitleArea },
  InputComps: { AmountInput },
  Links: { MarketLink },
  Icons: { WarningIcon, BackIcon },
} = Components;
const {
  PathUtils: { makePath, parseQuery },
} = Utils;
const { MARKET_ID_PARAM_NAME } = Constants;

const defaultAddLiquidityBreakdown: LiquidityBreakdown = {
  lpTokens: "0",
  cashAmount: "0",
  minAmounts: [],
};

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
      <LiquidityForm {...{ market, actionType }} />
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

interface LiquidityFormProps {
  market: MarketInfo;
  actionType: string;
}

const LiquidityForm = ({ market, actionType = ADD }: LiquidityFormProps) => {
  const history = useHistory();
  const {
    // account,
    balances,
    // loginAccount,
    // actions: { addTransaction },
  } = useUserStore();
  const { cashes }: DataState = useDataStore();
  const isRemove = actionType === REMOVE;
  const title = isRemove ? "Remove Liquidity" : "Add Liquidity";
  const { amm } = market;
  const [chosenCash, updateCash] = useState<string>(USDC);
  // const [breakdown, setBreakdown] = useState(defaultAddLiquidityBreakdown);
  // const [estimatedLpAmount, setEstimatedLpAmount] = useState<string>("0");
  const cash: Cash = cashes ? Object.values(cashes).find((c) => c.name === USDC) : Object.values(cashes)[0];
  const userTokenBalance = cash?.name ? balances[cash?.name]?.balance : "0";
  const shareBalance =
    balances && balances.lpTokens && balances.lpTokens[amm?.marketId] && balances.lpTokens[amm?.marketId].balance;
  const userMaxAmount = isRemove ? shareBalance : userTokenBalance;

  const [amount, updateAmount] = useState(isRemove ? userMaxAmount : "");
 

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
      <main>
        <AmountInput
          heading="Deposit Amount"
          ammCash={cash}
          updateInitialAmount={(amount) => updateAmount(amount)}
          initialAmount={amount}
          maxValue={userMaxAmount}
          chosenCash={isRemove ? SHARES : chosenCash}
          updateCash={updateCash}
          updateAmountError={() => null}
          error={false}
        />
      </main>
    </section>
  );
};

export default MarketLiquidityView;
