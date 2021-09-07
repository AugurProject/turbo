import React, { useMemo, useState } from "react";
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
  ContractCalls,
  Formatter
} from "@augurproject/comps";
import type { MarketInfo } from "@augurproject/comps/build/types";
import { useSimplifiedStore } from "modules/stores/simplified";
const { formatToken } = Formatter;
const { canAddLiquidity, getMaticUsdPrice } = ContractCalls;
const {
  Utils: { isMarketFinal },
} = Stores;
const { CREATE, USDC, MODAL_ADD_LIQUIDITY, ADD } = Constants;
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
  const totalAccountValue = useMemo(
    () =>
      handleValue(
        isLogged ? (showResolvedPositions ? balances?.totalAccountValue : balances?.totalAccountValueOpenOnly) : 0
      ),
    [isLogged, showResolvedPositions ? balances?.totalAccountValue : balances?.totalAccountValueOpenOnly]
  );
  const positionsValue = useMemo(
    () =>
      handleValue(
        isLogged ? (showResolvedPositions ? balances?.totalPositionUsd : balances?.totalPositionUsdOpenOnly) : 0
      ),
    [isLogged, showResolvedPositions ? balances?.totalPositionUsd : balances?.totalPositionUsdOpenOnly]
  );
  const usdValueUSDC = useMemo(() => handleValue(balances?.USDC?.usdValue || 0), [balances?.USDC?.usdValue]);
  const usdValueLP = useMemo(() => handleValue(balances?.totalCurrentLiquidityUsd || 0), [
    balances?.totalCurrentLiquidityUsd,
  ]);
  return (
    <div className={classNames(Styles.AppStats, { [Styles.small]: small, [Styles.liquidity]: liquidity })}>
      {!liquidity && (
        <ValueLabel large={!small} label="total acc value" light={!isLogged} value={totalAccountValue} small={small} />
      )}
      {!liquidity && (
        <ValueLabel large={!small} label="positions" light={!isLogged} value={positionsValue} small={small} />
      )}
      {liquidity && <ValueLabel large={!small} small={small} label="LP Positions" value={usdValueLP} />}
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

export const AvailableLiquidityRewards = ({balance}) => {
  const {
    loginAccount,
  } = useUserStore();
  const [price, setPrice] = useState(1);
  getMaticUsdPrice(loginAccount?.library).then(setPrice);
  const amount = formatToken(balance || "0");
  const rewardsInUsd = formatCash(Number(balance || "0") * price).formatted;
  return (
    <div className={Styles.AvailableLiquidityRewards}>
      <h4>My Available LP Rewards</h4>
      <span>{amount.formatted} {MaticIcon}</span>
      <p>(Will be claimed automatically when removing liquidity per market)</p>
      <span>(${rewardsInUsd})</span>
    </div>
  );
};

export const MaticIcon = (
  <svg viewBox="-1 -1 22 22" fill="none">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M8.64551 9.15828L9.98523 12.3018L11.9792 11.0857L11.9807 11.0851V8.65085L8.64551 9.15828Z"
      fill="#2BBDF7"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M14.561 6.82573L13.3164 6.32974L11.9863 6.21606V13.7807L13.9818 14.9975L15.5568 11.5871L14.5634 8.28955L14.561 6.82573Z"
      fill="#2891F9"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M14.4354 6.21863L13.9732 7.4351H13.9727V14.9987L15.9684 13.7823V6.21863H14.4354Z"
      fill="#2BBDF7"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M13.9821 5L11.9863 6.21742L13.9821 7.43453L15.9779 6.21742L13.9821 5Z"
      fill="#2B6DEF"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M9.98676 9.86706V9.86644L7.99127 7.50398L4 6.21606V13.7797L5.99518 14.9968L6.5654 10.8111L7.99127 11.0851V11.0838L9.98706 12.3006V9.86706H9.98676Z"
      fill="#2891F9"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M5.99638 5L4 6.2171L9.98614 9.86937L10.8907 9.31783L11.9816 8.65196L5.99638 5Z"
      fill="#2B6DEF"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M5.99639 9.86703H5.99609V14.9965L7.99187 13.7797V11.0841L5.99639 9.86703Z"
      fill="#2BBDF7"
    />
    <path
      d="M10 19C5.02944 19 1 14.9706 1 10H-1C-1 16.0751 3.92487 21 10 21V19ZM19 10C19 14.9706 14.9706 19 10 19V21C16.0751 21 21 16.0751 21 10H19ZM10 1C14.9706 1 19 5.02944 19 10H21C21 3.92487 16.0751 -1 10 -1V1ZM10 -1C3.92487 -1 -1 3.92487 -1 10H1C1 5.02944 5.02944 1 10 1V-1Z"
      fill="#DBE1E7"
    />
  </svg>
);

