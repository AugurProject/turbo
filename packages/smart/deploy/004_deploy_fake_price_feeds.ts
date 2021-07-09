import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isHttpNetworkConfig, makeSigner } from "../tasks";
import { FAKE_COINS } from "../src";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  if (!isHttpNetworkConfig(hre.network.config)) throw Error("Cannot deploy to non-HTTP network");
  const { deployments } = hre;
  const signer = await makeSigner(hre);
  const deployer = await signer.getAddress();

  if (hre.network.config.deployConfig?.externalAddresses?.priceFeeds) {
    console.log("Not deploying fake price feeds because real ones were specified");
  }

  const version = 3; // arbitrary
  for (const coin of FAKE_COINS) {
    await deployments.deploy(coin.deploymentName, {
      contract: "FakePriceFeed",
      from: deployer,
      args: [coin.decimals, coin.description, version],
      log: true,
    });
  }
};

func.tags = ["PriceFeeds"];

export default func;
