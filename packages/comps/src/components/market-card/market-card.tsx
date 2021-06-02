import React, { useMemo } from "react";
import classNames from "classnames";

import Styles from "./market-card.styles.less";
import { AmmExchange, AmmOutcome, MarketInfo, MarketOutcome } from "../../types";
import { formatApy, formatCashPrice, formatDai, getCashFormat } from "../../utils/format-number";
import { getMarketEndtimeFull } from "../../utils/date-utils";
import { CategoryIcon, CategoryLabel, CurrencyTipIcon, ReportingStateLabel, ValueLabel } from "../common/labels";
import { MARKET_STATUS, TWELVE_HOUR_TIME } from "../../utils/constants";
import { PrimaryButton } from "../common/buttons";
import { MarketLink } from "../../utils/links/links";
import { ConfirmedCheck } from "../common/icons";
import { isMarketFinal } from '../../stores/utils';

export const LoadingMarketCard = () => {
  return (
    <article className={Styles.LoadingMarketCard}>
      <div>
        <div />
        <div />
        <div />
      </div>
      <div>
        <div />
        <div />
        <div />
      </div>
      <div>
        <div />
        <div />
        <div />
      </div>
    </article>
  );
};

export const MarketCard = ({ marketId, markets, ammExchanges, ...props }) => {
  const market = useMemo(() => markets[marketId], [marketId, markets]);
  const amm = useMemo(() => ammExchanges[marketId], [marketId, ammExchanges]);
  if (!market) return <LoadingMarketCard />;
  return <MarketCardView market={market as MarketInfo} amm={amm as AmmExchange} {...props} />;
};

export const combineOutcomeData = (ammOutcomes: AmmOutcome[], marketOutcomes: MarketOutcome[]) => {
  if (!ammOutcomes || ammOutcomes.length === 0) return [];
  return marketOutcomes.map((mOutcome, index) => ({
    ...mOutcome,
    ...ammOutcomes[index],
  }));
};

export const outcomesToDisplay = (ammOutcomes: AmmOutcome[], marketOutcomes: MarketOutcome[]) => {
  const combinedData = combineOutcomeData(ammOutcomes, marketOutcomes);
  const invalid = combinedData.slice(0, 1);
  const yes = combinedData.slice(2, 3);
  const no = combinedData.slice(1, 2);
  let newOrder = invalid.concat(yes).concat(no).concat(combinedData.slice(3));
  if (newOrder[0].isFinalNumerator && newOrder[0].payoutNumerator !== "0" && newOrder[0].payoutNumerator !== null) {
    // invalid is winner -- only pass invalid
    newOrder = invalid;
  } else {
    newOrder = newOrder.filter((outcome) => !outcome.isInvalid);
  }
  return newOrder;
};

export const orderOutcomesForDisplay = (ammOutcomes: AmmOutcome[] = []): AmmOutcome[] =>
  ammOutcomes.length > 0 && ammOutcomes[0].id === 0 ? ammOutcomes.slice(1).concat(ammOutcomes.slice(0, 1)) : ammOutcomes;

export const unOrderOutcomesForDisplay = (ammOutcomes: AmmOutcome[]): AmmOutcome[] =>
  ammOutcomes.slice(-1).concat(ammOutcomes.slice(0, -1));

const OutcomesTable = ({ amm }: { amm: AmmExchange }) => {
  const {
    market: { hasWinner, winner },
    hasLiquidity,
  } = amm;
  const content = hasWinner ? (
    <div className={Styles.WinningOutcome}>
      <span>Winning Outcome</span>
      <span>{amm.ammOutcomes.find((o) => o.id === winner)?.name}</span>
      {ConfirmedCheck}
    </div>
  ) : (
    orderOutcomesForDisplay(amm.ammOutcomes)
      .slice(0, 3)
      .map((outcome) => {
        const OutcomePrice =
          !hasLiquidity || isNaN(Number(outcome?.price)) || Number(outcome?.price) <= 0
            ? `${getCashFormat(amm?.cash?.name)?.symbol} -`
            : formatCashPrice(outcome.price, amm?.cash?.name).full;
        return (
          <div key={`${outcome.name}-${amm?.marketId}-${outcome.id}`}>
            <span>{outcome.name.toLowerCase()}</span>
            <span>{OutcomePrice}</span>
          </div>
        );
      })
  );
  return (
    <div
      className={classNames(Styles.OutcomesTable, {
        [Styles.hasWinner]: hasWinner,
      })}
    >
      {content}
    </div>
  );
};

export const MarketTitleArea = ({
  title = null,
  description = null,
  startTimestamp,
  timeFormat = TWELVE_HOUR_TIME,
}: any) => (
  <span>
    <span>
      {!!title && <span>{title}</span>}
      {!!description && <span>{description}</span>}
    </span>
    <span>{getMarketEndtimeFull(startTimestamp, timeFormat)}</span>
  </span>
);

export const MarketCardView = ({
  amm,
  market,
  marketTransactions,
  handleNoLiquidity = (market: MarketInfo) => {},
  noLiquidityDisabled = false,
  timeFormat = TWELVE_HOUR_TIME,
}: {
  amm: AmmExchange;
  market: MarketInfo;
  marketTransactions?: any;
  handleNoLiquidity?: Function;
  noLiquidityDisabled?: boolean;
  timeFormat?: string;
}) => {
  const { categories, marketId, reportingState, hasWinner } = market;
  const formattedApy = useMemo(() => marketTransactions?.apy && formatApy(marketTransactions.apy).full, [
    marketTransactions?.apy,
  ]);
  const formattedVol = useMemo(
    () => marketTransactions?.volumeTotalUSD && formatDai(marketTransactions.volumeTotalUSD).full,
    [marketTransactions?.volumeTotalUSD]
  );
  const extraOutcomes = amm?.ammOutcomes?.length - 3;

  return (
    <article
      className={classNames(Styles.MarketCard, {
        [Styles.NoLiquidity]: !amm?.id,
      })}
      onClick={() => {
        !amm?.id && !isMarketFinal(market) && handleNoLiquidity(market);
      }}
    >
      <div>
        <article
          className={classNames({
            [Styles.Trading]: reportingState === MARKET_STATUS.TRADING,
          })}
        >
          <ReportingStateLabel {...{ reportingState }} />
          <CategoryIcon {...{ categories }} />
          <CategoryLabel {...{ categories }} />
          <div>
            <ReportingStateLabel {...{ reportingState }} />
            <CurrencyTipIcon name={amm?.cash?.name} marketId={marketId} />
          </div>
        </article>
        {!amm?.id && !market.hasWinner ? (
          <>
            <MarketTitleArea {...{ ...market, timeFormat }} />
            <div>
              <span>Market requires Initial liquidity</span>
              <PrimaryButton
                title={
                  noLiquidityDisabled
                    ? "Connect an account to earn fees as a liquidity provider"
                    : "Earn fees as a liquidity provider"
                }
                disabled={noLiquidityDisabled}
                text="Earn fees as a liquidity provider"
              />
            </div>
          </>
        ) : (
          <MarketLink id={marketId} dontGoToMarket={false}>
            <MarketTitleArea {...{ ...market, timeFormat }} />
            <ValueLabel label="total volume" value={formattedVol || "-"} />
            <ValueLabel label="APY" value={formattedApy || "- %"} />
            <OutcomesTable {...{ amm }} />
            {!hasWinner && extraOutcomes > 0 && (
              <span className={Styles.ExtraOutcomes}>{`+ ${extraOutcomes} more Outcomes`}</span>
            )}
          </MarketLink>
        )}
      </div>
    </article>
  );
};
