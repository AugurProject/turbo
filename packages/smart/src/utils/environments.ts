import fs from "fs";
import { addresses as originalAddresses, Addresses, ChainId, graphChainNames, MarketFactory } from "../../addresses";

interface EnvironmentMarketFactory extends MarketFactory {
  ammFactoryGraphName?: string;
  marketFactoryGraphName: string;
}

interface EnvironmentAddresses extends Addresses {
  [index: string]: any;
  marketFactories: EnvironmentMarketFactory[];
  teamSportsMarketFactories: EnvironmentMarketFactory[];
  mmaMarketFactories: EnvironmentMarketFactory[];
  cryptoMarketFactories: EnvironmentMarketFactory[];
}

const marketFactoryTypes: {
  [index: string]: string | null;
} = {
  SportsLink: "teamSportsMarketFactories",
  MMALink: "mmaMarketFactories",
  Crypto: "cryptoMarketFactories",
  Trusted: null,
};

const marketFactoryGraphNames: {
  [index: string]: string | null;
} = {
  SportsLink: "SportsLinkMarketFactory",
  MMALink: "MmaMarketFactory",
  Crypto: "CryptoMarketFactory",
  Trusted: null,
};

function generateJsonEnvironments() {
  const networks = Object.keys(originalAddresses);
  fs.mkdirSync("environments", { recursive: true });
  for (let i = 0; i < networks.length; i++) {
    const key = Number(networks[i]) as ChainId;
    const addresses = originalAddresses[key] as EnvironmentAddresses;
    addresses.cryptoMarketFactories = [];
    for (let j = 0; j < addresses?.marketFactories.length; j++) {
      addresses.marketFactories[j].ammFactoryGraphName = j === 0 ? "AmmFactory" : `AmmFactory${j + 1}`;
      addresses.marketFactories[j].marketFactoryGraphName =
        j === 0 ? "AbstractMarketFactory" : `AbstractMarketFactory${j + 1}`;

      const marketFactoryType = addresses.marketFactories[j].type;
      const marketFactoryTypeName = marketFactoryTypes.hasOwnProperty(marketFactoryType)
        ? marketFactoryTypes[marketFactoryType]
        : null;
      if (marketFactoryTypeName) {
        if (!addresses[marketFactoryTypeName]) {
          addresses[marketFactoryTypeName] = [];
        }

        const specificFactory = { ...addresses.marketFactories[j] };
        delete specificFactory.ammFactoryGraphName;
        const marketFactoryGraphName = marketFactoryGraphNames.hasOwnProperty(marketFactoryType)
          ? marketFactoryGraphNames[marketFactoryType]
          : null;

        if (marketFactoryGraphName) {
          specificFactory.marketFactoryGraphName =
            addresses[marketFactoryTypeName].length === 0
              ? marketFactoryGraphName
              : `${marketFactoryGraphName}${j + 1}`;
          addresses[marketFactoryTypeName].push(specificFactory);
        }
      }
    }
    // @ts-ignore
    const file = JSON.stringify(addresses);
    // @ts-ignore
    fs.writeFileSync(`environments/${graphChainNames[networks[i]]}.json`, file);
  }
}

module.exports.generateJsonEnvironments = generateJsonEnvironments;
