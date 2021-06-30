import React from "react";
import { Constants, DerivedMarketData } from "@augurproject/comps";
import { useMarketEventMarkets } from "../sports-card/sports-card";
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
  const shape = useRules(marketEvent);
  return (
    <section>
      <h2>{shape.eventDescription}</h2>
      <h3>{shape.estimatedStart}</h3>
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
    </section>
  );
};
