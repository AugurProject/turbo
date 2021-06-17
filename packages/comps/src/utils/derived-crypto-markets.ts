import { BigNumber as BN } from "bignumber.js";
import { MarketInfo } from "types";
import { CRYPTO } from "./constants";
import { getMarketEndtimeFull } from "./date-utils";
import { formatCashPrice } from "./format-number";

const COINS: { [index: string]: { name: string; priceFeedUrl: string } } = {
  "1": { name: "BTC", priceFeedUrl: "https://data.chain.link/polygon/mainnet/crypto-usd/btc-usd" },
  "2": { name: "ETH", priceFeedUrl: "https://data.chain.link/polygon/mainnet/crypto-usd/eth-usd" },
};

export const deriveMarketInfo = (market: MarketInfo, marketData: any) => {
  const { coinIndex, price } = marketData;
  const { endTimestamp, creationTimestamp } = market;
  const tokenIndes = new BN(String(coinIndex)).toNumber();
  const tokenPrice = formatCashPrice(new BN(String(price)).div(new BN(10).pow(6)), "USDC", { decimals: 6 });
  const eventId = `${tokenIndes}-${price}-${endTimestamp}`;
  const coinInfo = COINS[String(tokenIndes)];
  const categories = [CRYPTO, coinInfo.name, ""];

  const { shareTokens } = market;
  const outcomes = decodeOutcomes(market, shareTokens);
  const { title, description } = getMarketTitle(endTimestamp, coinInfo.name, tokenPrice.full);

  return {
    ...market,
    title,
    description,
    categories,
    outcomes,
    eventId,
    price: tokenPrice.full,
    startTimestamp: Number(creationTimestamp),
    coinIndex: String(tokenIndes),
  };
};

const getMarketTitle = (endTimestamp: number, name: string, price: string): { title: string; description: string } => {
  const dateTime = getMarketEndtimeFull(endTimestamp);
  const title = `Will ${name} settle above ${price} on ${dateTime}?`;

  return { title, description: "" };
};

export const getResolutionRules = (market: MarketInfo): string[] => {
  if (!market || !market?.coinIndex) return [];
  return resolutionRules(market?.coinIndex, market?.price);
};

const decodeOutcomes = (market: MarketInfo, shareTokens: string[]) => {
  return shareTokens.map((shareToken, i) => {
    return {
      id: i,
      name: i === 0 ? "Above" : "Not Above",
      symbol: shareToken,
      isInvalid: false,
      isWinner: market.hasWinner && i === market.winner ? true : false,
      isFinalNumerator: false, // need to translate final numerator payout hash to outcome
      shareToken,
    };
  });
};

const resolutionRules = (tokenIndes, price) => {
  const coinInfo = COINS[String(tokenIndes)];
  return [
    `This is a market on whether the price of Token will settle above ${price} on Date at 4 pm ET.`,
    `The market will resolve to "Above" if the resolution source reports greater than ${price}.`,
    `This market will resolve to "Not Above" if the resolution source reports equal to or less than ${price}.`,
    `The resolution price for Token is determined by querying the Chainlink price oracle. The result is the median of all most recently reported prices from the list of Chainlink oracles found here: ${coinInfo.priceFeedUrl}`,
  ];
};
