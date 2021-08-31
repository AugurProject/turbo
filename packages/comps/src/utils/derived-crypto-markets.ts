import { BigNumber as BN } from "bignumber.js";
import { MarketInfo } from "types";
import { CRYPTO } from "./constants";
import { getMarketEndtimeDate } from "./date-utils";
import { formatCashPrice } from "./format-number";

const COINS: { [index: string]: { name: string; decimals: number; priceFeedUrl: string } } = {
  "1": { name: "BTC", decimals: 0, priceFeedUrl: "https://data.chain.link/polygon/mainnet/crypto-usd/btc-usd" },
  "2": { name: "ETH", decimals: 0, priceFeedUrl: "https://data.chain.link/polygon/mainnet/crypto-usd/eth-usd" },
  "3": { name: "MATIC", decimals: 4, priceFeedUrl: "https://data.chain.link/polygon/mainnet/crypto-usd/matic-usd" },
  "4": { name: "DOGE", decimals: 4, priceFeedUrl: "https://data.chain.link/polygon/mainnet/crypto-usd/doge-usd" },
  "5": { name: "REP", decimals: 2, priceFeedUrl: "https://data.chain.link/polygon/mainnet/crypto-usd/rep-usd" },
  "6": { name: "LINK", decimals: 2, priceFeedUrl: "https://data.chain.link/polygon/mainnet/crypto-usd/link-usd" },
};
const MARKET_DURATION = new BN(7 * 24 * 60 * 60);
export const deriveMarketInfo = (market: MarketInfo, marketData: any) => {
  const { coinIndex, creationPrice, endTime, creationTimestamp } = marketData;
  const { endTimestamp } = market;
  const tokenInds = new BN(String(coinIndex)).toNumber();
  const coinInfo = COINS[String(tokenInds)];
  const displayPrice = new BN(String(creationPrice)).div(new BN(10).pow(Number(coinInfo.decimals))); //.decimalPlaces(0, 1);
  const tokenPrice = formatCashPrice(displayPrice, "USDC", { decimals: coinInfo.decimals });
  const eventId = `${tokenInds}-${creationPrice}-${endTimestamp || endTime}`;

  const categories = [CRYPTO, coinInfo.name, ""];

  const { shareTokens } = market;
  const outcomes = decodeOutcomes(market, shareTokens);
  const { title, description } = getMarketTitle(coinInfo.name, tokenPrice.full);

  const startTimestamp =
    endTime || endTimestamp
      ? new BN(endTime || endTimestamp).toNumber()
      : new BN(String(creationTimestamp)).plus(MARKET_DURATION).toNumber();

  return {
    ...market,
    title,
    description,
    categories,
    outcomes,
    eventId,
    price: tokenPrice.full,
    startTimestamp,
    coinIndex: String(tokenInds),
  };
};

const getMarketTitle = (name: string, price: string): { title: string; description: string } => {
  const title = `Will ${name} settle above ${price}?`;
  return { title, description: "" };
};

export const getResolutionRules = (market: MarketInfo): string[] => {
  if (!market || !market?.coinIndex) return [];
  return resolutionRules(market?.coinIndex, market?.price, market?.endTimestamp);
};

const decodeOutcomes = (market: MarketInfo, shareTokens: string[] = []) => {
  return shareTokens.map((shareToken, i) => {
    return {
      id: i,
      name: i === 0 ? "Yes" : "No",
      symbol: shareToken,
      isInvalid: false,
      isWinner: market.hasWinner && i === market.winner ? true : false,
      isFinalNumerator: false, // need to translate final numerator payout hash to outcome
      shareToken,
    };
  });
};

const resolutionRules = (tokenIndes, price, endTimestamp) => {
  const coinInfo = COINS[String(tokenIndes)];
  const date = getMarketEndtimeDate(endTimestamp);
  return [
    `This is a market on whether the price of ${name} will settle above ${price} on ${date} at 4 pm ET.`,
    `The market will resolve to "YES" if the resolution source reports greater than ${price}. This market will resolve to "NO" is the resolution source reports equal to or less than ${price}.`,
    `The resolution price for ${name} is determined by querying the Chainlink price oracle. The result is the median of all most recently reported prices from the list of Chainlink oracles found here: ${priceFeedUrl}`,
  ];
};
