import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isHttpNetworkConfig, makeSigner } from "../tasks";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  if (!isHttpNetworkConfig(hre.network.config)) throw Error("Cannot deploy to non-HTTP network");
  const { deployments } = hre;
  const signer = await makeSigner(hre);
  const deployer = await signer.getAddress();

  const { btcPriceFeed, ethPriceFeed } = hre.network.config.deployConfig?.externalAddresses || {};

  if (btcPriceFeed) {
    console.log(`Using external address for BTC price feed: "${btcPriceFeed}"`);
  } else {
    await deployments.deploy("BTCPriceFeed", {
      contract: "FakePriceFeed",
      from: deployer,
      args: [6, "BTC / USD", 3],
      log: true,
    });
  }

  if (ethPriceFeed) {
    console.log(`Using external address for ETH price feed: "${ethPriceFeed}"`);
  } else {
    await deployments.deploy("ETHPriceFeed", {
      contract: "FakePriceFeed",
      from: deployer,
      args: [6, "ETH / USD", 3],
      log: true,
    });
  }
};

func.tags = ["PriceFeeds"];

export default func;
