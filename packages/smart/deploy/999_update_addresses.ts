import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { getChainId } from "hardhat";
import path from "path";
import { updateAddressConfig } from "../src/addressesConfigUpdater";
import { Addresses, graphChainNames, addresses as originalAddresses, ChainId } from "../addresses";
import { isHttpNetworkConfig } from "../tasks";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  if (!isHttpNetworkConfig(hre.network.config)) throw Error("Cannot deploy to non-HTTP network");
  console.log("Done deploying! Writing deploy information to addresses.ts");

  const { deployments } = hre;
  const chainId = parseInt(await getChainId());

  const collateral =
    hre.network.config.deployConfig?.externalAddresses?.usdcToken || (await deployments.get("Collateral")).address;
  const reputationToken =
    hre.network.config.deployConfig?.externalAddresses?.reputationToken ||
    (await deployments.get("Reputation")).address;
  const balancerFactory =
    hre.network.config.deployConfig?.externalAddresses?.balancerFactory || (await deployments.get("BFactory")).address;

  const sportsLinkMarketFactory = await deployments.get("SportsLinkMarketFactory");
  const mmaLinkMarketFactory = await deployments.get("MMALinkMarketFactory");
  const ammFactory = await deployments.get("AMMFactory");

  // If the AMMFactory was deployed then use its block number.
  // Else, use the previously recorded block number.
  // That should exist but if it doesn't then use zero.
  const uploadBlockNumber =
    ammFactory.receipt?.blockNumber || originalAddresses[chainId as ChainId]?.info.uploadBlockNumber || 0;

  const addresses: Addresses = {
    reputationToken,
    balancerFactory,
    ammFactory: ammFactory.address,
    marketFactories: {
      sportsball: {
        type: "SportsLink",
        address: sportsLinkMarketFactory.address,
        collateral,
      },
      mma: {
        type: "SportsLink",
        address: mmaLinkMarketFactory.address,
        collateral,
      },
    },
    info: {
      graphName: graphChainNames[chainId],
      uploadBlockNumber,
    },
  };

  console.log(JSON.stringify(addresses, null, 2));

  const addressFilePath = path.resolve(__dirname, "../addresses.ts");
  updateAddressConfig(addressFilePath, chainId, addresses);
};

func.runAtTheEnd = true;

export default func;
