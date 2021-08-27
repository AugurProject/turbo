import React, { useMemo } from "react";
import Styles from "./labels.styles.less";
import classNames from "classnames";
import {
  useAppStatusStore,
  useUserStore,
  Icons,
  Utils,
  Constants,
  LabelComps,
  ButtonComps,
  Stores,
  ContractCalls
} from "@augurproject/comps";
import type { MarketInfo } from "@augurproject/comps/build/types";
import { useSimplifiedStore } from "modules/stores/simplified";
const { canAddLiquidity } = ContractCalls;
const {
  Utils: { isMarketFinal }
} = Stores;
const {
  CREATE,
  USDC,
  MODAL_ADD_LIQUIDITY,
  ADD,
} = Constants;
const { ValueLabel } = LabelComps;
const { PrimaryThemeButton } = ButtonComps;
const {
  Formatter: { formatCash },
} = Utils;
const { USDCIcon, EthIcon } = Icons;

const handleValue = (value, cashName = USDC) =>
  formatCash(value, cashName, {
    bigUnitPostfix: true,
  }).full;

export const AppViewStats = ({ small = false, liquidity = false }) => {
  const { isLogged } = useAppStatusStore();
  const {
    settings: { showResolvedPositions },
  } = useSimplifiedStore();

  const { balances } = useUserStore();
  const totalAccountValue = useMemo(() => handleValue(isLogged ? showResolvedPositions ? balances?.totalAccountValue : balances?.totalAccountValueOpenOnly : 0), [
    isLogged,
    showResolvedPositions ? balances?.totalAccountValue : balances?.totalAccountValueOpenOnly,
  ]);
  const positionsValue = useMemo(() => handleValue(isLogged ? showResolvedPositions ? balances?.totalPositionUsd : balances?.totalPositionUsdOpenOnly : 0), [
    isLogged,
    showResolvedPositions ? balances?.totalPositionUsd : balances?.totalPositionUsdOpenOnly,
  ]);
  const usdValueUSDC = useMemo(() => handleValue(balances?.USDC?.usdValue || 0), [balances?.USDC?.usdValue]);
  return (
    <div className={classNames(Styles.AppStats, { [Styles.small]: small })}>
      {!liquidity && <ValueLabel large={!small} label="total acc value" light={!isLogged} value={totalAccountValue} small={small} />}
      {!liquidity && <ValueLabel large={!small} label="positions" light={!isLogged} value={positionsValue} small={small} />}
      {liquidity && <ValueLabel large={!small} small={small} label="LP Positions" value={"$0.00"} />}
      <ValueLabel large={!small} small={small} label="Available USDC" value={usdValueUSDC} />
    </div>
  );
};

export const AddLiquidity = ({ market }: { market: MarketInfo }) => {
  const {
    isLogged,
    actions: { setModal },
  } = useAppStatusStore();
  const canAddLiq = canAddLiquidity(market);
  return (
    <PrimaryThemeButton
      customClass={Styles.AddLiquidityButton}
      title={isLogged ? "Add liquidity" : "Connect an account to add liquidity"}
      action={() => {
        if (isLogged) {
          setModal({
            type: MODAL_ADD_LIQUIDITY,
            market,
            liquidityModalType: ADD,
            currency: market?.amm?.cash?.name,
          });
        }
      }}
      disabled={!isLogged || isMarketFinal(market) || !canAddLiq}
      text="add liquidity"
      subText="earn fees as a liquidity provider"
    />
  );
};

export const AddCurrencyLiquidity = ({ market, currency }: { market: MarketInfo; currency: string }) => {
  const {
    isLogged,
    actions: { setModal },
  } = useAppStatusStore();
  return (
    <button
      className={classNames(Styles.AddCurrencyLiquidity)}
      title={isLogged ? `Create this market in ${currency}` : `Connect an account to create this market in ${currency}`}
      onClick={() => {
        if (isLogged) {
          setModal({
            type: MODAL_ADD_LIQUIDITY,
            market,
            liquidityModalType: CREATE,
            currency,
          });
        }
      }}
      disabled={!isLogged || isMarketFinal(market)}
    >
      {currency === USDC ? USDCIcon : EthIcon}
      {`Create this market in ${currency}`}
    </button>
  );
};
