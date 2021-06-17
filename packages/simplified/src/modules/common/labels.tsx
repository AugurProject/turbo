import React, { useEffect, useMemo } from "react";
import Styles from "./labels.styles.less";
import { useLocation } from "react-router";
import classNames from "classnames";
import { UnsupportedChainIdError, useWeb3React } from "@web3-react/core";
import {
  useAppStatusStore,
  useDataStore,
  useUserStore,
  Icons,
  Utils,
  Constants,
  PARA_CONFIG,
  LabelComps,
  ButtonComps,
  Stores,
  Links,
  createBigNumber
} from "@augurproject/comps";
import type { MarketInfo } from "@augurproject/comps/build/types";
import { useSimplifiedStore } from "modules/stores/simplified";
const {
  Utils: { isMarketFinal }
} = Stores;
const {
  CREATE,
  USDC,
  // ETH,
  MODAL_ADD_LIQUIDITY,
  MARKET,
  ADD,
  DUST_POSITION_AMOUNT,
} = Constants;
const { ExternalLink } = Links;
const { ValueLabel } = LabelComps;
const { PrimaryThemeButton } = ButtonComps;
const {
  PathUtils: { parsePath },
  Formatter: { formatCash },
} = Utils;
const { USDCIcon, EthIcon, PlusIcon } = Icons;

const handleValue = (value, cashName = USDC) =>
  formatCash(value, cashName, {
    bigUnitPostfix: true,
  }).full;

export const AppViewStats = ({ small }) => {
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
  // const ethValue = useMemo(
  //   () => handleValue(balances?.ETH?.balance || 0, ETH),
  //   [balances?.ETH?.balance]
  // );
  const usdValueUSDC = useMemo(() => handleValue(balances?.USDC?.usdValue || 0), [balances?.USDC?.usdValue]);
  return (
    <div className={classNames(Styles.AppStats, { [Styles.small]: small })}>
      <ValueLabel large={!small} label="total acc value" light={!isLogged} value={totalAccountValue} small={small} />
      <ValueLabel large={!small} label="positions" light={!isLogged} value={positionsValue} small={small} />
      <ValueLabel large={!small} small={small} label="Available USDC" value={usdValueUSDC} />
    </div>
  );
};

export const AddLiquidity = ({ market }: { market: MarketInfo }) => {
  const {
    isLogged,
    actions: { setModal },
  } = useAppStatusStore();
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
      disabled={!isLogged || isMarketFinal(market)}
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

export const NetworkMismatchBanner = () => {
  const { errors } = useDataStore();
  const { loginAccount, balances } = useUserStore();
  const { error } = useWeb3React();
  const { networkId } = PARA_CONFIG;
  const location = useLocation();
  const path = parsePath(location.pathname)[0];
  const { chainId } = loginAccount || {};
  const isNetworkMismatch = useMemo(() => !!chainId && String(networkId) !== String(chainId), [chainId, networkId]);
  const isGraphError = !!errors;
  const unsupportedChainIdError = error && error instanceof UnsupportedChainIdError;

  useEffect(() => {
    // in the event of an error, scroll to top to force banner to be seen.
    if (isNetworkMismatch || isGraphError || unsupportedChainIdError) {
      document.getElementById("mainContent")?.scrollTo(0, 0);
      window.scrollTo(0, 1);
    }
  }, [isNetworkMismatch, isGraphError, unsupportedChainIdError]);
  const needMoreMatic = Boolean(loginAccount?.account) && Boolean(balances?.ETH?.balance) && Boolean(createBigNumber(balances?.ETH?.balance).lte(DUST_POSITION_AMOUNT));

  return (
    <>
      {(isNetworkMismatch || unsupportedChainIdError) && (
        <article
          className={classNames(Styles.NetworkMismatch, {
            [Styles.Market]: path === MARKET,
          })}
        >
          You're connected to an unsupported network
        </article>
      )}
      {isGraphError && (
        <article
          className={classNames(Styles.NetworkMismatch, {
            [Styles.Market]: path === MARKET,
          })}
        >
          Unable to retrieve market data
        </article>
      )}
      {needMoreMatic && <article
          className={classNames(Styles.NetworkMismatch, Styles.WarningBanner, {
            [Styles.Market]: path === MARKET,
          })}
        >
          You will need MATIC in order to participate. <ExternalLink label="Click here for more information." URL="https://help.augur.net" />
      </article>}
    </>
  );
};
