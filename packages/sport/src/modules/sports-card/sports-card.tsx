import React, { useMemo } from "react";
import Styles from "./sports-card.styles.less";
import { CategoriesTrail } from "../categories/categories";
import { LabelComps, Links, Utils } from "@augurproject/comps";
import { useSportsStore } from "../stores/sport";
import { getSizedPrice, SizedPrice } from "modules/utils";
const {
  Formatter: { formatDai },
  DateUtils: { getMarketEndtimeFull },
  OddsUtils: { convertToNormalizedPrice, convertToOdds },
} = Utils;
const { ValueLabel } = LabelComps;
const { MarketLink } = Links;

export const SportsCard = ({ marketId, markets, ammExchanges, timeFormat, marketTransactions, ...props }) => {
  const market = markets?.[marketId];
  const sizedPrices = getSizedPrice(market);
  return (
    <article className={Styles.SportsMarketCard}>
      <SportsCardTopbar {...{ market, timeFormat }} />
      <SportsCardTitle {...{ ...market }} />
      <SportsCardOutcomes {...{ ...market, sizedPrices }} />
      <SportsCardFooter {...{ marketTransactions }} />
    </article>
  );
};

const SportsCardTopbar = ({ market, timeFormat }) => (
  <div className={Styles.SportsCardTopbar}>
    <CategoriesTrail {...{ ...market }} />
    <span>{getMarketEndtimeFull(market.startTimestamp, timeFormat)}</span>
    <span>{SocialMediaIcon}</span>
  </div>
);

const SportsCardTitle = ({ marketId, title, description }) => (
  <MarketLink id={marketId} dontGoToMarket={false}>
    {!!description && <span className={Styles.SportsCardTitle}>{description}</span>}
  </MarketLink>
);

const SportsCardOutcomes = ({ title, amm, sizedPrices }) => {
  const outcomes = [].concat(amm?.ammOutcomes || []);
  const noContest = outcomes.shift();
  if (noContest) {
    outcomes.push(noContest);
  }
  return (
    <section className={Styles.SportsCardOutcomes}>
      <header>{!!title && <span>{title}</span>}</header>
      <main>
        {outcomes?.map((outcome) => (
          <SportsOutcomeButton {...{ ...outcome, sizedPrices }} />
        ))}
      </main>
    </section>
  );
};

const SportsOutcomeButton = ({ id, name, price, sizedPrices }: {id: number, name: string, price: string, sizedPrices: SizedPrice}) => {
  const {
    settings: { oddsFormat },
  } = useSportsStore();
  let sizedPrice = sizedPrices ? { price: sizedPrices[id]?.price, size: sizedPrices[id]?.size } : {};
  const odds = useMemo(() => (sizedPrice !== "" ? convertToOdds(convertToNormalizedPrice({ price: sizedPrice.price }), oddsFormat).full : "-"), [sizedPrice, oddsFormat]);
  return (
    <div className={Styles.SportsOutcomeButton}>
      <label>{name}</label>
      <button onClick={() => console.log(`NOT YET IMPLEMTED, TODO: Add a bet to buy "${name}" at ${odds} odds to the betslip when this is clicked.`)}>{odds}</button>
      {sizedPrice?.size && <label>{formatDai(sizedPrice?.size).full}</label>}
    </div>
  );
};

const SportsCardFooter = ({ marketTransactions }) => {
  const formattedVol = useMemo(
    () => marketTransactions?.volumeTotalUSD && formatDai(marketTransactions.volumeTotalUSD).full,
    [marketTransactions?.volumeTotalUSD]
  );
  return (
    <div className={Styles.SportsCardFooter}>
      <span>{RulesIcon} Rules</span>
      <ValueLabel label="total volume" value={formattedVol || "-"} />
    </div>
  );
};
const SocialMediaIcon = (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M14.9243 3.33335C14.2548 3.33335 13.7122 3.87604 13.7122 4.54548C13.7122 5.21491 14.2548 5.7576 14.9243 5.7576C15.5937 5.7576 16.1364 5.21491 16.1364 4.54548C16.1364 3.87604 15.5937 3.33335 14.9243 3.33335ZM12.0455 4.54548C12.0455 2.95556 13.3344 1.66669 14.9243 1.66669C16.5142 1.66669 17.8031 2.95556 17.8031 4.54548C17.8031 6.13539 16.5142 7.42426 14.9243 7.42426C14.1603 7.42426 13.4658 7.12663 12.9504 6.641L8.18373 9.34932C8.23204 9.55842 8.25758 9.77623 8.25758 10C8.25758 10.2238 8.23204 10.4416 8.18373 10.6507L12.9504 13.359C13.4658 12.8734 14.1603 12.5758 14.9243 12.5758C16.5142 12.5758 17.8031 13.8647 17.8031 15.4546C17.8031 17.0445 16.5142 18.3334 14.9243 18.3334C13.3344 18.3334 12.0455 17.0445 12.0455 15.4546C12.0455 15.2308 12.071 15.0129 12.1194 14.8038L7.35275 12.0955C6.83737 12.5811 6.14284 12.8788 5.37879 12.8788C3.78888 12.8788 2.5 11.5899 2.5 10C2.5 8.4101 3.78888 7.12122 5.37879 7.12122C6.14285 7.12122 6.83738 7.41888 7.35276 7.90456L12.1194 5.19626C12.071 4.98714 12.0455 4.76929 12.0455 4.54548ZM4.16667 10C4.16667 9.33057 4.70935 8.78789 5.37879 8.78789C6.04822 8.78789 6.59091 9.33057 6.59091 10C6.59091 10.6694 6.04822 11.2121 5.37879 11.2121C4.70935 11.2121 4.16667 10.6694 4.16667 10ZM13.7122 15.4546C13.7122 14.7851 14.2548 14.2424 14.9243 14.2424C15.5937 14.2424 16.1364 14.7851 16.1364 15.4546C16.1364 16.124 15.5937 16.6667 14.9243 16.6667C14.2548 16.6667 13.7122 16.124 13.7122 15.4546Z"
      fill="#555577"
    />
  </svg>
);

const RulesIcon = (
  <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
    <g clip-path="url(#clip0)">
      <path
        d="M4.25033 5.83333H12.2503M4.25033 8.5H12.2503M4.25033 11.1667H7.58366M0.916992 2.5H15.5837V14.5H0.916992V2.5Z"
        stroke="#555577"
        stroke-width="2"
        stroke-miterlimit="10"
        stroke-linecap="square"
      />
    </g>
    <defs>
      <clipPath id="clip0">
        <rect width="16" height="16" fill="white" transform="translate(0.25 0.5)" />
      </clipPath>
    </defs>
  </svg>
);
