import React, { useMemo } from "react";
import classNames from "classnames";

import Styles from "./market-card.styles.less";
import { AmmExchange, AmmOutcome, MarketInfo, MarketOutcome } from "../../types";
import { formatApy, formatLiquidity, formatCashPrice, formatDai } from "../../utils/format-number";
import { getMarketEndtimeFull } from "../../utils/date-utils";
import { CategoryIcon, CategoryLabel, ReportingStateLabel, ValueLabel } from "../common/labels";
import { MARKET_FACTORY_TYPES, MARKET_STATUS, TWELVE_HOUR_TIME } from "../../utils/constants";
import { MarketLink } from "../../utils/links/links";
import { ConfirmedCheck } from "../common/icons";
import { TinyThemeButton } from "../common/buttons";

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
  const market: MarketInfo = useMemo(() => markets[marketId], [marketId, markets]);
  const amm: AmmExchange = useMemo(() => ammExchanges[marketId], [marketId, ammExchanges]);
  if (!market) return <LoadingMarketCard />;
  return <MarketCardView {...{ amm, market, ...props}} />;
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

export const orderOutcomesForDisplay = (
  ammOutcomes: AmmOutcome[] = [],
  marketFactoryType: string = MARKET_FACTORY_TYPES.SPORTSLINK
): AmmOutcome[] => {
  if (marketFactoryType !== MARKET_FACTORY_TYPES.CRYPTO)
    return ammOutcomes.length > 0 && ammOutcomes[0].id === 0
      ? ammOutcomes.slice(1).concat(ammOutcomes.slice(0, 1))
      : ammOutcomes;
  return ammOutcomes;
};

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
    orderOutcomesForDisplay(amm.ammOutcomes, amm?.market?.marketFactoryType)
      .slice(0, 3)
      .map((outcome) => {
        const OutcomePrice =
          !hasLiquidity || isNaN(Number(outcome?.price)) || Number(outcome?.price) <= 0
            ? `-`
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
  const formattedLiquidity = useMemo(() => formatLiquidity(amm?.liquidityUSD || "0.00", { bigUnitPostfix: true }).full, [amm?.liquidityUSD]);
  const formattedApy = useMemo(() => marketTransactions?.apy && formatApy(marketTransactions.apy).full, [
    marketTransactions?.apy,
  ]);
  const formattedVol = useMemo(
    () => marketTransactions?.volumeTotalUSD && formatDai(marketTransactions.volumeTotalUSD, { bigUnitPostfix: true }).full,
    [marketTransactions?.volumeTotalUSD]
  );
  const extraOutcomes = amm?.ammOutcomes?.length - 3;
  const marketHasNoLiquidity = !amm?.id && !market.hasWinner;
  return (
    <article
      className={classNames(Styles.MarketCard, {
        [Styles.NoLiquidity]: !amm?.id,
      })}
    >
      <MarketLink id={marketId} dontGoToMarket={false}>
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
            {marketHasNoLiquidity ? (
              <TinyThemeButton
                customClass={Styles.NoLiquidityPill}
                action={() => {}}
                text="Add liquidity to earn fees"
                disabled
              />
            ) : (
              <ValueLabel label="Liquidity Provider APY" value={formattedApy || "-"} />
            )}
          </div>
        </article>
        <section>
          <MarketTitleArea {...{ ...market, timeFormat }} />
          <ValueLabel label="total volume" value={formattedVol || "-"} />
          <ValueLabel label="Liquidity" value={marketHasNoLiquidity ? "-" : formattedLiquidity || "-"} />
          <OutcomesTable {...{ amm }} />
          {!hasWinner && extraOutcomes > 0 && (
            <span className={Styles.ExtraOutcomes}>{`+ ${extraOutcomes} more Outcomes`}</span>
          )}
        </section>
      </MarketLink>
    </article>
  );
};
