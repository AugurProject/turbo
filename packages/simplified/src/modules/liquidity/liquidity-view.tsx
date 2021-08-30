import React, { useState, useMemo } from "react";
import Styles from "./liquidity-view.styles.less";
import {
  Components,
  Utils,
  useDataStore,
  useUserStore,
  useAppStatusStore,
  Constants,
  ContractCalls,
} from "@augurproject/comps";
import { categoryItems } from "../constants";
import { AppViewStats, AvailableLiquidityRewards } from "../common/labels";
import { useSimplifiedStore } from "../stores/simplified";
import { MarketInfo } from "@augurproject/comps/build/types";
const { MODAL_ADD_LIQUIDITY, ADD, CREATE } = Constants;
const {
  Links: { MarketLink },
  SelectionComps: { SquareDropdown },
  InputComps: { SearchInput },
  LabelComps: { CategoryIcon },
  MarketCardComps: { MarketTitleArea },
  ButtonComps: { PrimaryThemeButton },
} = Components;
const { canAddLiquidity } = ContractCalls;
const {
  DateUtils: { getMarketEndtimeDate },
  Formatter: { formatApy, formatCash },
} = Utils;

interface LiquidityMarketCardProps {
  key?: string;
  market: MarketInfo;
}

const LiquidityMarketCard = ({ market }: LiquidityMarketCardProps): React.Component => {
  const {
    settings: { timeFormat },
  } = useSimplifiedStore();
  const {
    actions: { setModal },
  } = useAppStatusStore();
  const {
    balances: { lpTokens },
  } = useUserStore();
  const { transactions } = useDataStore();
  const { marketId, categories, amm, endTimestamp } = market;
  const marketTransactions = transactions[marketId];
  const formattedApy = useMemo(() => marketTransactions?.apy && formatApy(marketTransactions.apy).full, [
    marketTransactions?.apy,
  ]);
  const formattedVol = useMemo(
    () =>
      marketTransactions?.volumeTotalUSD &&
      formatCash(marketTransactions.volumeTotalUSD, amm?.cash?.name, { bigUnitPostfix: true }).full,
    [marketTransactions?.volumeTotalUSD]
  );
  const hasLiquidity = lpTokens?.[marketId];
  const canAddLiq = canAddLiquidity(market);
  return (
    <article className={Styles.LiquidityMarketCard}>
      <MarketLink id={marketId} dontGoToMarket={false}>
        <CategoryIcon {...{ categories }} />
        <MarketTitleArea {...{ ...market, timeFormat }} />
      </MarketLink>
      <span>{endTimestamp ? getMarketEndtimeDate(endTimestamp, timeFormat) : "-"}</span>
      <span>{formattedVol || "-"}</span>
      <span>{formattedApy || "-"}</span>
      <span>{hasLiquidity ? formatCash(hasLiquidity?.usdValue, amm?.cash?.name).full : "$0.00"}</span>
      <span>0 MATIC</span>
      <PrimaryThemeButton
        text="ADD LIQUIDITY"
        small
        disabled={!canAddLiq}
        action={() =>
          setModal({
            type: MODAL_ADD_LIQUIDITY,
            market,
            liquidityModalType: amm?.hasLiquidity ? CREATE : ADD,
            currency: amm?.cash?.name,
          })
        }
      />
    </article>
  );
};

const LiquidityView = () => {
  const {
    marketsViewSettings,
    actions: { updateMarketsViewSettings },
  } = useSimplifiedStore();
  const { markets } = useDataStore();
  const [filter, setFilter] = useState("");
  const { primaryCategory } = marketsViewSettings;

  return (
    <div className={Styles.LiquidityView}>
      <AppViewStats small liquidity />
      <AvailableLiquidityRewards />
      <h1>Explore LP Opportunties</h1>
      <p>
        Add Market liquidity to earn fees and rewards. <a href=".">Learn more →</a>
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
          {Object.entries(markets).map(([key, item]: [string, MarketInfo]) => (
            <LiquidityMarketCard market={item} key={key} />
          ))}
        </section>
      </section>
    </div>
  );
};

export default LiquidityView;
