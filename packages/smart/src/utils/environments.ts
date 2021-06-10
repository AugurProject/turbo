import fs from "fs";
import { graphChainNames, addresses as originalAddresses, ChainId, Addresses, MarketFactory } from "../../addresses";

interface EnvironmentMarketFactory extends MarketFactory {
  ammFactoryGraphName: string;
  abstractMarketFactoryGraphName: string;
}

interface EnvironmentAddresses extends Addresses {
  marketFactories: EnvironmentMarketFactory[];
}

function generateJsonEnvironments() {
  const keys = Object.keys(originalAddresses);
  fs.mkdirSync("environments", { recursive: true });
  for (let i = 0; i < keys.length; i++) {
    const key = Number(keys[i]) as ChainId;
    const addresses = originalAddresses[key] as EnvironmentAddresses;
    for (let j = 0; j < addresses?.marketFactories.length; j++) {
      addresses.marketFactories[j].ammFactoryGraphName = j === 0 ? "AmmFactory" : `AmmFactory${j + 1}`;
      addresses.marketFactories[j].abstractMarketFactoryGraphName =
        j === 0 ? "AbstractMarketFactory" : `AbstractMarketFactory${j + 1}`;
    }
    // @ts-ignore
    const file = JSON.stringify(addresses);
    // @ts-ignore
    fs.writeFileSync(`environments/${graphChainNames[keys[i]]}.json`, file);
  }
}

module.exports.generateJsonEnvironments = generateJsonEnvironments;
