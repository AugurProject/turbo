import { AmmExchange, MarketInfo, ActivityData } from "../types";

export const shapeUserActvity = (
  account: string,
  markets: { [id: string]: MarketInfo },
  ammExchanges: { [id: string]: AmmExchange }
): ActivityData[] => {
  return [];
};
