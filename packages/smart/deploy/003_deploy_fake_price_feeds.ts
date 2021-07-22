import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isHttpNetworkConfig, makeSigner } from "../tasks";
import { COIN_DECIMALS, COIN_SYMBOLS, coinDeploymentName, coinDescription } from "../src";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  if (!isHttpNetworkConfig(hre.network.config)) throw Error("Cannot deploy to non-HTTP network");
  const { deployments } = hre;
  const signer = await makeSigner(hre);
  const deployer = await signer.getAddress();

  if (hre.network.config.deployConfig?.externalAddresses?.priceFeeds) {
    console.log("Not deploying fake price feeds because real ones were specified");
    return;
  }

  const version = 3; // arbitrary
  for (const symbol of COIN_SYMBOLS) {
    await deployments.deploy(coinDeploymentName(symbol), {
      contract: "FakePriceFeed",
      from: deployer,
      args: [COIN_DECIMALS, coinDescription(symbol), version],
      log: true,
    });
  }
};

func.tags = ["PriceFeeds"];

export default func;
