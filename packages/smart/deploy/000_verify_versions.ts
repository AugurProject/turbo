import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isHttpNetworkConfig } from "../tasks";
import { addresses as originalAddresses, ChainId, MarketFactory } from "../addresses";
import { getChainId } from "hardhat";

// Goes through the versions in addresses and matches against the version to deploy.
// Throws an error if the version to deploy has already been deployed.
const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  if (!isHttpNetworkConfig(hre.network.config)) throw Error("Cannot deploy to non-HTTP network");

  const chainId = parseInt(await getChainId());
  const marketFactories: MarketFactory[] = originalAddresses[chainId as ChainId]?.marketFactories || [];

  const version = hre.network.config.deployConfig?.version;
  for (const marketFactory of marketFactories) {
    if (marketFactory.version === version) {
      const message = `Cannot deploy because version "${version} has already been deployed. Change hardhat config.`;
      console.error(message);
      throw Error(message);
    }
  }
};

func.tags = ["Version"];

export default func;
