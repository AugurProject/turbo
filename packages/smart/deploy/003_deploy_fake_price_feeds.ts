import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isHttpNetworkConfig, makeSigner } from "../tasks";
import { FakePriceFeed__factory } from "../typechain";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  if (!isHttpNetworkConfig(hre.network.config)) throw Error("Cannot deploy to non-HTTP network");
  const { deployments } = hre;
  const signer = await makeSigner(hre);
  const deployer = await signer.getAddress();

  if (hre.network.config.deployConfig?.externalAddresses?.btcPriceFeed) {
    console.log(
      `Using external address for BTC price feed: "${hre.network.config.deployConfig.externalAddresses.btcPriceFeed}"`
    );
  } else {
    const deployment = await deployments.deploy("BTCPriceFeed", {
      contract: "FakePriceFeed",
      from: deployer,
      args: [6, "BTC / USD", 3],
      log: true,
    });
    const priceFeed = FakePriceFeed__factory.connect(deployment.address, signer);
    await priceFeed.addRound(1, 40000e6, 2, 4, 1); // arbitrary values
  }

  if (hre.network.config.deployConfig?.externalAddresses?.ethPriceFeed) {
    console.log(
      `Using external address for ETH price feed: "${hre.network.config.deployConfig.externalAddresses.ethPriceFeed}"`
    );
  } else {
    const deployment = await deployments.deploy("ETHPriceFeed", {
      contract: "FakePriceFeed",
      from: deployer,
      args: [6, "ETH / USD", 3],
      log: true,
    });
    const priceFeed = FakePriceFeed__factory.connect(deployment.address, signer);
    await priceFeed.addRound(1, 3000e6, 2, 4, 1); // arbitrary values
  }
};

func.tags = ["PriceFeeds"];

export default func;
