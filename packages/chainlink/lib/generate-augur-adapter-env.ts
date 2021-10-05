import { addresses as contractAddresses, MarketFactoryType } from "@augurproject/smart";

const mumbaiNetworkID = 80001;

const findMarketFactory = (marketFactoryType: MarketFactoryType): string => {
  const marketFactoryAddresses = contractAddresses[mumbaiNetworkID]?.marketFactories || [];
  const marketFactory = marketFactoryAddresses.find((i) => i.type === marketFactoryType);
  if (typeof marketFactory === "undefined") {
    // This will fail when an attempt to add the job is made.
    return "NO_CONTRACT";
  }

  return marketFactory.address;
};

const generateTemplate = () => {
  console.log(`CRYPTO_MARKET_FACTORY=${findMarketFactory("CryptoCurrency")}
MLB_MARKET_FACTORY=${findMarketFactory("MLB")}
MMA_MARKET_FACTORY=${findMarketFactory("MMA")}
NBA_MARKET_FACTORY=${findMarketFactory("NBA")}
NFL_MARKET_FACTORY=${findMarketFactory("NFL")}
GROUPED_MARKET_FACTORY=${findMarketFactory("Grouped")}
`);
};

generateTemplate();
