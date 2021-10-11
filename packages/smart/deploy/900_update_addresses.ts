import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import path from "path";
import { updateAddressConfig } from "../src/addressesConfigUpdater";
import { addresses as originalAddresses } from "../addresses";
import { DeploymentsExtension } from "hardhat-deploy/dist/types";
import {
  Addresses,
  FetcherContractName,
  graphChainNames,
  MARKET_FACTORY_TYPE_TO_CONTRACT_NAME,
  MarketFactory,
  MarketFactorySubType,
  MarketFactoryType,
  NetworkNames,
} from "../constants";
import { isNetworkName } from "../tasks/common";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  if (!hre.network.config.live) {
    return;
  }

  console.log("Done deploying! Writing deploy information to addresses.ts");

  const { deployments, network } = hre;
  const networkName = network.name;

  if (isNetworkName(networkName)) {
    const { address: collateral } = await deployments.get("Collateral");
    const { address: reputationToken } = await deployments.get("Reputation");
    const { address: balancerFactory } = await deployments.get("BFactory");

    const ammFactory = await deployments.get("AMMFactory").catch(() => undefined);
    const masterChef = await deployments.get("MasterChef").catch(() => undefined);

    const uploadBlockNumber = await getUploadBlockNumber(network.name as NetworkNames, deployments);

    const version = "FILL THIS OUT"; // version of a particular market factory
    const subtype: MarketFactorySubType = "V3";

    async function includeMarketFactory(
      type: MarketFactoryType,
      fetcherName: FetcherContractName,
      description: string
    ) {
      const factoryName = MARKET_FACTORY_TYPE_TO_CONTRACT_NAME[type];
      const marketFactory = await deployments.getOrNull(factoryName);
      const fetcher = await deployments.getOrNull(fetcherName);

      if (!marketFactory) return;

      const index = getFactoryIndex(marketFactories, marketFactory.address);
      const hasFactory = index !== -1;

      if (hasFactory) {
        const factory = marketFactories[index];
        if (!factory.ammFactory && ammFactory) factory.ammFactory = ammFactory.address;
        if (fetcher) factory.fetcher = fetcher.address;
        if (masterChef) {
          marketFactories[index] = {
            ...factory,
            hasRewards: true,
            masterChef: masterChef?.address || "",
          };
        }
      } else {
        marketFactories.unshift({
          version,
          description,
          type,
          subtype,
          address: marketFactory.address,
          collateral,
          ammFactory: ammFactory?.address || "",
          fetcher: fetcher?.address || "",
          hasRewards: true,
          masterChef: masterChef?.address || "",
        });
      }
    }

    const sportsFetcher: FetcherContractName = "NBAFetcher"; // the sports are similar enough that one fetcher works for all of them

    // Add new market factories. Only new ones.
    const marketFactories: MarketFactory[] = originalAddresses[network.name as NetworkNames]?.marketFactories || [];
    await includeMarketFactory("CryptoCurrency", "CryptoCurrencyFetcher", "crypto prices");
    await includeMarketFactory("MMA", sportsFetcher, "mma/ufc");
    await includeMarketFactory("NFL", sportsFetcher, "nfl");
    await includeMarketFactory("NBA", sportsFetcher, "nba");
    await includeMarketFactory("MLB", sportsFetcher, "mlb");
    await includeMarketFactory("Grouped", "GroupedFetcher", "grouped");

    const addresses: Addresses = {
      reputationToken,
      balancerFactory,
      marketFactories,
      info: {
        graphName: graphChainNames[networkName],
        uploadBlockNumber,
      },
    };

    if (hre.network.config.live) console.log(JSON.stringify(addresses, null, 2));

    const addressFilePath = path.resolve(__dirname, "../addresses.ts");
    updateAddressConfig(addressFilePath, networkName, addresses);
  }
};

function getFactoryIndex(marketFactories: MarketFactory[], address: string): number {
  return marketFactories.findIndex((factory) => factory.address === address);
}

// Use the existing uploadBlockNumber, if there is one.
// Else, go through all deployments and find the smallest block number.
// If somehow that doesn't yield anything, default to zero.
async function getUploadBlockNumber(networkName: NetworkNames, deployments: DeploymentsExtension): Promise<number> {
  const previous = originalAddresses[networkName]?.info.uploadBlockNumber;
  if (previous) return previous;

  const deployed = Object.values(await deployments.all())
    .map((d) => d.receipt?.blockNumber)
    .filter((d): d is number => typeof d !== "undefined")
    .sort((a: number, b: number) => a - b);
  if (deployed.length > 0) return deployed[0];

  return 0;
}

func.runAtTheEnd = true;
func.tags = ["UpdateAddresses"];

export default func;
