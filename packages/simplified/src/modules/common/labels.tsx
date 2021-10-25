import React, { useMemo, useState } from "react";
import Styles from "./labels.styles.less";
import classNames from "classnames";
import {
  useAppStatusStore,
  useUserStore,
  Utils,
  Components,
  Constants,
  ContractCalls,
  Formatter,
} from "@augurproject/comps";
// @ts-ignore
import MetamaskIcon from "../ConnectAccount/assets/metamask.png";

const { formatToken } = Formatter;
const { getMaticUsdPrice } = ContractCalls;
const { USDC, WMATIC_TOKEN_ADDRESS } = Constants;
const {
  Formatter: { formatCash },
} = Utils;
const {
  Icons: { MaticIcon },
  LabelComps: { ValueLabel },
  ButtonComps: { TinyThemeButton },
} = Components;

const handleValue = (value, cashName = USDC) =>
  formatCash(value, cashName, {
    bigUnitPostfix: true,
  }).full;

export const AppViewStats = ({ small = false, liquidity = false, trading = false }) => {
  const { isLogged } = useAppStatusStore();
  const { balances } = useUserStore();
  const totalAccountValue = useMemo(
    () =>
      handleValue(
        isLogged ? balances?.totalAccountValue : 0
      ),
    [isLogged, balances?.totalAccountValue]
  );
  const positionsValue = useMemo(
    () =>
      handleValue(
        isLogged ? balances?.totalPositionUsd : 0
      ),
    [isLogged, balances?.totalPositionUsd]
  );
  const usdValueUSDC = useMemo(() => handleValue(balances?.USDC?.usdValue || 0), [balances?.USDC?.usdValue]);
  const usdValueLP = useMemo(() => handleValue(balances?.totalCurrentLiquidityUsd || 0), [
    balances?.totalCurrentLiquidityUsd,
  ]);
  return (
    <div className={classNames(Styles.AppStats, { [Styles.small]: small, [Styles.full]: liquidity && trading, [Styles.LPOnly]: liquidity && !trading })}>
      <ValueLabel large={!small} label="total acc value" light={!isLogged} value={totalAccountValue} small={small} />
      {trading && (
        <ValueLabel large={!small} label="trading positions" light={!isLogged} value={positionsValue} small={small} />
      )}
      {liquidity && <ValueLabel large={!small} small={small} label="Liquidity Positions" value={usdValueLP} />}
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

export const MaticAddMetaMaskToken = () => {
  const AddToken = async () => {
    try {
      // @ts-ignore
      await ethereum.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: {
            address: WMATIC_TOKEN_ADDRESS,
            symbol: "WMATIC",
            decimals: 18,
            image: "https://polygonscan.com/token/images/wMatic_32.png",
          },
        },
      });
    } catch {
      console.error("MetaMask not installed or locked.");
    }
  };

  return (
    <TinyThemeButton
      customClass={Styles.AddMetaMaskToken}
      customContent={
        <>
          <img alt="" height={12} src={MetamaskIcon} /> Add wMATIC to MetaMask
        </>
      }
      action={() => AddToken()}
    />
  );
};
