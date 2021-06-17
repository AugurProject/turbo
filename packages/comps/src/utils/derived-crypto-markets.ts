import { BigNumber as BN } from "bignumber.js";
import { MarketInfo } from "types";
import { CRYPTO } from "./constants";
import { getMarketEndtimeFull } from "./date-utils";
import { formatCashPrice } from "./format-number";

const COINS: {[index: string]: { name: string, priceFeedUrl: string }} = {
    "1": { name: "BTC", priceFeedUrl: "https://data.chain.link/polygon/mainnet/crypto-usd/btc-usd" },
    "2": { name: "ETH", priceFeedUrl: "https://data.chain.link/polygon/mainnet/crypto-usd/eth-usd" },
}

export const deriveMarketInfo = (market: MarketInfo, marketData: any) => {
    const {
      coinIndex,
      price,
    } = marketData;
    const {
        endTimestamp,
        creationTimestamp
    } = market;
    const tokenIndes = new BN(String(coinIndex)).toNumber();
    const tokenPrice = formatCashPrice(new BN(String(price)).div(new BN(10).pow(6)), "USDC", {decimals: 6 });
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
      price,
      startTimestamp: Number(creationTimestamp),
      coinIndex: String(tokenIndes),
    };
  }


const getMarketTitle = (
  endTimestamp: number,
  name: string,
  price: string,
): { title: string; description: string } => {
    const dateTime = getMarketEndtimeFull(endTimestamp);
  const title = `Will ${name} settle above ${price} on ${dateTime}?`

  return { title, description: "" };
};

export const getResolutionRules = (market: MarketInfo): string[] => {
  if (!market || !market?.coinIndex) return [];
  return resolutionRules[market?.coinIndex];
};

const decodeOutcomes = (
    market: MarketInfo,
    shareTokens: string[],
  ) => {
    return shareTokens.map((shareToken, i) => {
      return {
        id: i,
        name: i === 0 ? "Above" : "Not Above",
        symbol: shareToken,
        isInvalid: false,
        isWinner: market.hasWinner && (i === market.winner) ? true : false,
        isFinalNumerator: false, // need to translate final numerator payout hash to outcome
        shareToken,
      };
    });
  };

const resolutionRules = {
  "1": [
        `A fight is considered official once the first round begins, regardless of the scheduled or actual duration.`,
        `Market resolves based on the official result immediately following the fight. Later announcements, enquirers, or changes to the official result will not affect market settlement.`,
        `If a fighter is substituted before the fight begins the market should resolve as 'Draw/No Contest'.`,
        `If a fighter is disqualified during the fight, the opposing fighter should be declared the winner. If both fighters are disqualified the market should resolve as 'Draw/No Contest'.`,
        `If the fight is cancelled before it starts for any reason, the market should resolve as 'No Contest'.`,
        `A draw can occur when the fight is either stopped before completion or after all rounds are completed and goes to the judges' scorecards for decision.  If the match ends in a draw, only the 'Draw/No Contest' result should be the winning outcome.`,
      ],
  "2": [
    `A fight is considered official once the first round begins, regardless of the scheduled or actual duration.`,
    `Market resolves based on the official result immediately following the fight. Later announcements, enquirers, or changes to the official result will not affect market settlement.`,
    `If a fighter is substituted before the fight begins the market should resolve as 'Draw/No Contest'.`,
    `If the fight is cancelled before it starts for any reason, the market should resolve as 'No Contest'.`,
    `If the official time is exactly on (equal to) the over/under number the market should resolve as 'Over'.`,
    `Markets referring to round/fight duration represents the actual time passed in the round/fight, as applicable, depending on the scheduled round/fight duration. For example, Over 2.5 Total Rounds will be settled as 'Over' once two and a half minutes or more in the 3rd Round has passed.`,
  ]
};
