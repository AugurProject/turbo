import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { getChainId } from "hardhat";
import path from "path";
import { updateAddressConfig } from "../src/addressesConfigUpdater";
import {
  Addresses,
  graphChainNames,
  addresses as originalAddresses,
  ChainId,
  MarketFactory,
  FetcherContractName,
  MARKET_FACTORY_TYPE_TO_CONTRACT_NAME,
  MarketFactoryType,
  MarketFactorySubType,
} from "../addresses";
import { ExternalAddresses, isHttpNetworkConfig } from "../tasks";
import { DeploymentsExtension } from "hardhat-deploy/dist/types";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  if (!isHttpNetworkConfig(hre.network.config)) throw Error("Cannot deploy to non-HTTP network");
  console.log("Done deploying! Writing deploy information to addresses.ts");

  const { deployments } = hre;
  const chainId = parseInt(await getChainId());

  const externalAddresses: ExternalAddresses | undefined = hre.network.config.deployConfig?.externalAddresses;
  const collateral = externalAddresses?.usdcToken || (await deployments.get("Collateral")).address;
  const reputationToken = externalAddresses?.reputationToken || (await deployments.get("Reputation")).address;
  const balancerFactory = externalAddresses?.balancerFactory || (await deployments.get("BFactory")).address;
  // Until Rewards, one AMM factory can handle all market factories.
  const ammFactory = await deployments.get("AMMFactory").catch(() => undefined);

  const uploadBlockNumber = await getUploadBlockNumber(chainId as ChainId, deployments);

  const version = "FILL THIS OUT"; // version of a particular market factory
  const subtype: MarketFactorySubType = "V3";

  async function includeMarketFactory(type: MarketFactoryType, fetcherName: FetcherContractName, description: string) {
    const factoryName = MARKET_FACTORY_TYPE_TO_CONTRACT_NAME[type];
    const marketFactory = await deployments.get(factoryName).catch(() => undefined);
    const fetcher = await deployments.get(fetcherName).catch(() => undefined);

    if (marketFactory && !hasFactory(marketFactories, marketFactory.address)) {
      marketFactories.unshift({
        version,
        description,
        type,
        subtype,
        address: marketFactory.address,
        collateral,
        ammFactory: ammFactory?.address || "",
        fetcher: fetcher?.address || "",
      });
    }
  }

  const sportsFetcher = "NBAFetcher"; // the sports are similar enough that one fetcher works for all of them

  // Add new market factories. Only new ones.
  const marketFactories: MarketFactory[] = originalAddresses[chainId as ChainId]?.marketFactories || [];
  await includeMarketFactory("Crypto", "", "crypto prices");
  await includeMarketFactory("MMA", sportsFetcher, "mma/ufc");
  await includeMarketFactory("NFL", sportsFetcher, "nfl");
  await includeMarketFactory("NBA", sportsFetcher, "nba");
  await includeMarketFactory("MLB", sportsFetcher, "mlb");
  await includeMarketFactory("Futures", "", "futures");

  const addresses: Addresses = {
    reputationToken,
    balancerFactory,
    marketFactories,
    info: {
      graphName: graphChainNames[chainId],
      uploadBlockNumber,
    },
  };

  console.log(JSON.stringify(addresses, null, 2));

  const addressFilePath = path.resolve(__dirname, "../addresses.ts");
  updateAddressConfig(addressFilePath, chainId, addresses);
};

function hasFactory(marketFactories: MarketFactory[], address: string): boolean {
  return marketFactories.filter((f) => f.address === address).length !== 0;
}

// Use the existing uploadBlockNumber, if there is one.
// Else, go through all deployments and find the smallest block number.
// If somehow that doesn't yield anything, default to zero.
async function getUploadBlockNumber(chainId: ChainId, deployments: DeploymentsExtension): Promise<number> {
  const previous = originalAddresses[chainId]?.info.uploadBlockNumber;
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
