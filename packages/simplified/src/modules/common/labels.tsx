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
  ContractCalls,
  Formatter,
} from "@augurproject/comps";
import { useSimplifiedStore } from "modules/stores/simplified";
const { formatToken } = Formatter;
const { getMaticUsdPrice } = ContractCalls;
const { USDC} = Constants;
const { ValueLabel } = LabelComps;
const {
  Formatter: { formatCash },
} = Utils;
const { MaticIcon } = Icons;

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

export const AvailableLiquidityRewards = ({ balance }) => {
  const { loginAccount } = useUserStore();
  const [price, setPrice] = useState(1);
  getMaticUsdPrice(loginAccount?.library).then(setPrice);
  const amount = formatToken(balance || "0", { decimals: 2 });
  const rewardsInUsd = formatCash(Number(balance || "0") * price, USDC).formatted;
  return (
    <div className={Styles.AvailableLiquidityRewards}>
      <section>
        <h4>My Available LP Rewards</h4>
        <p>(Will be claimed automatically when removing liquidity per market)</p>
      </section>
      <section>
        <span>
          {amount.formatted} {MaticIcon}
        </span>
        <span>(${rewardsInUsd})</span>
      </section>
    </div>
  );
};
