import fs from "fs";
import { addresses as originalAddresses, Addresses, ChainId, graphChainNames, MarketFactory } from "../../addresses";

interface EnvironmentMarketFactory extends MarketFactory {
  ammFactoryGraphName: string;
  marketFactoryGraphName: string;
}

interface EnvironmentAddresses extends Addresses {
  [index: string]: any;
  cryptoMarketFactoriesV1: EnvironmentMarketFactory[];
  cryptoMarketFactoriesV2: EnvironmentMarketFactory[];
  cryptoMarketFactoriesV3: EnvironmentMarketFactory[];
  futuresMarketFactoriesV3: EnvironmentMarketFactory[];
  marketFactories: EnvironmentMarketFactory[];
  mlbMarketFactoriesV3: EnvironmentMarketFactory[];
  mmaMarketFactoriesV1: EnvironmentMarketFactory[];
  mmaMarketFactoriesV2: EnvironmentMarketFactory[];
  mmaMarketFactoriesV3: EnvironmentMarketFactory[];
  nbaMarketFactoriesV3: EnvironmentMarketFactory[];
  nflMarketFactoriesV2: EnvironmentMarketFactory[];
  nflMarketFactoriesV3: EnvironmentMarketFactory[];
  teamSportsMarketFactoriesV1: EnvironmentMarketFactory[];
  teamSportsMarketFactoriesV2: EnvironmentMarketFactory[];
}

const marketFactoryTypes: {
  [index: string]: string;
} = {
  CryptoV1: "cryptoMarketFactoriesV1",
  CryptoV2: "cryptoMarketFactoriesV2",
  CryptoV3: "cryptoMarketFactoriesV3",
  FuturesV3: "futuresMarketFactoriesV3",
  MLBV3: "mlbMarketFactoriesV3",
  MMALinkV1: "mmaMarketFactoriesV1",
  MMALinkV2: "mmaMarketFactoriesV2",
  MMAV3: "mmaMarketFactoriesV3",
  NBAV3: "nbaMarketFactoriesV3",
  NFLV2: "nflMarketFactoriesV2",
  NFLV3: "nflMarketFactoriesV3",
  SportsLinkV1: "teamSportsMarketFactoriesV1",
  SportsLinkV2: "teamSportsMarketFactoriesV2",
};

const marketFactoryGraphNames: {
  [index: string]: string;
} = {
  CryptoV1: "CryptoMarketFactoryV1",
  CryptoV2: "CryptoMarketFactoryV2",
  CryptoV3: "CryptoMarketFactoryV3",
  FuturesV3: "FuturesMarketFactoryV3",
  MLBV3: "MlbMarketFactoryV3",
  MMALinkV1: "MmaMarketFactoryV1",
  MMALinkV2: "MmaMarketFactoryV2",
  MMAV3: "MmaMarketFactoryV3",
  NBAV3: "NbaMarketFactoryV3",
  NFLV2: "NflMarketFactoryV2",
  NFLV3: "NflMarketFactoryV3",
  SportsLinkV1: "SportsLinkMarketFactoryV1",
  SportsLinkV2: "SportsLinkMarketFactoryV2",
};

function generateJsonEnvironments() {
  const networks: string[] = Object.keys(originalAddresses);
  fs.mkdirSync("environments", { recursive: true });
  for (let i = 0; i < networks.length; i++) {
    const key = Number(networks[i]) as ChainId;
    let addresses = originalAddresses[key] as EnvironmentAddresses;
    addresses.marketFactories = addresses.marketFactories.map((marketFactory, index) => ({
      ...marketFactory,
      ammFactoryGraphName: index === 0 ? "AmmFactory" : `AmmFactory-${index}`,
      marketFactoryGraphName: `AbstractMarketFactory${marketFactory.subtype}`,
    }));
    const v1abstractMarketFactories = addresses.marketFactories
      .filter(({ subtype }) => subtype === "V1")
      .map((marketFactory, index) => ({
        ...marketFactory,
        marketFactoryGraphName:
          index === 0 ? marketFactory.marketFactoryGraphName : marketFactory.marketFactoryGraphName + "-" + index,
      }));
    const v2abstractMarketFactories = addresses.marketFactories
      .filter(({ subtype }) => subtype === "V2")
      .map((marketFactory, index) => ({
        ...marketFactory,
        marketFactoryGraphName:
          index === 0 ? marketFactory.marketFactoryGraphName : marketFactory.marketFactoryGraphName + "-" + index,
      }));
    const v3abstractMarketFactories = addresses.marketFactories
      .filter(({ subtype }) => subtype === "V3")
      .map((marketFactory, index) => ({
        ...marketFactory,
        marketFactoryGraphName:
          index === 0 ? marketFactory.marketFactoryGraphName : marketFactory.marketFactoryGraphName + "-" + index,
      }));
    addresses.marketFactories = [
      ...v1abstractMarketFactories,
      ...v2abstractMarketFactories,
      ...v3abstractMarketFactories,
    ];
    const specificMarketFactories: {
      [key: string]: EnvironmentMarketFactory[];
    } = {};
    addresses.marketFactories.forEach((marketFactory) => {
      const marketFactoryType = marketFactory.type + marketFactory.subtype;
      const marketFactoryName = marketFactoryTypes[marketFactoryType];
      const marketFactoryGraphName = marketFactoryGraphNames[marketFactoryType];
      if (marketFactoryName) {
        if (!specificMarketFactories[marketFactoryName]) {
          specificMarketFactories[marketFactoryName] = [];
        }
        specificMarketFactories[marketFactoryName].push({
          ...marketFactory,
          marketFactoryGraphName: marketFactoryGraphName,
        });
      }
    });
    Object.keys(specificMarketFactories).forEach((key) => {
      specificMarketFactories[key] = specificMarketFactories[key].map((marketFactory, index) => ({
        ...marketFactory,
        marketFactoryGraphName:
          index === 0 ? marketFactory.marketFactoryGraphName : marketFactory.marketFactoryGraphName + "-" + index,
      }));
    });
    addresses = {
      ...addresses,
      ...specificMarketFactories,
    };
    const file = JSON.stringify(addresses);
    fs.writeFileSync(`environments/${graphChainNames[Number(networks[i])]}.json`, file);
  }
}

module.exports.generateJsonEnvironments = generateJsonEnvironments;
