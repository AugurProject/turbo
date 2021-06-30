import React from "react";
import Styles from "./modal.styles.less";
import { Constants, DerivedMarketData, ButtonComps, DateUtils, useAppStatusStore } from "@augurproject/comps";
import { useMarketEventMarkets } from "../sports-card/sports-card";
import { Header } from "./common";
import { useSportsStore } from "../stores/sport";

const { PrimaryThemeButton } = ButtonComps;
const { getMarketEndtimeFull } = DateUtils;
const { getResolutionRules } = DerivedMarketData;
const { SPORTS_MARKET_TYPE_LABELS } = Constants;

const useRules = (marketEvent) => {
  const markets = useMarketEventMarkets(marketEvent);
  const content = Object.entries(markets).map(([sportsMarketType, marketInfo]) => ({
    heading: SPORTS_MARKET_TYPE_LABELS[sportsMarketType],
    rules: getResolutionRules(marketInfo),
  }));
  return {
    eventDescription: marketEvent.description,
    estimatedStart: marketEvent.startTimestamp,
    content,
  };
};

export const ModalRules = ({ marketEvent }) => {
  const {
    actions: { closeModal },
  } = useAppStatusStore();
  const {
    settings: { timeFormat },
  } = useSportsStore();
  const shape = useRules(marketEvent);
  return (
    <section className={Styles.RulesModal}>
      <Header title="Event Rules" subtitle={null} />
      <main>
        <section>
          <h2>{shape.eventDescription}</h2>
          <span>Estimated Start Time:</span>
          <span>{getMarketEndtimeFull(shape.estimatedStart, timeFormat)}</span>
        </section>
        {shape.content.map((marketRule) => (
          <div>
            <h4>{marketRule.heading}</h4>
            <ul>
              {marketRule.rules.map((rule) => (
                <li>{rule}</li>
              ))}
            </ul>
          </div>
        ))}
      </main>
      <footer>
        <PrimaryThemeButton text="Ok" action={closeModal} />
      </footer>
    </section>
  );
};
