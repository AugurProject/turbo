import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isHttpNetworkConfig, makeSigner } from "../tasks";
import { FakePriceFeed__factory } from "../typechain";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  if (!isHttpNetworkConfig(hre.network.config)) throw Error("Cannot deploy to non-HTTP network");
  const { deployments } = hre;
  const signer = await makeSigner(hre);

  const { btcPriceFeed, ethPriceFeed } = hre.network.config.deployConfig?.externalAddresses || {};

  if (!btcPriceFeed) {
    console.log("Setting price feed for BTC");
    const priceFeed = FakePriceFeed__factory.connect((await deployments.get("BTCPriceFeed")).address, signer);
    await priceFeed.addRound(1, 40000e6, 2, 4, 1); // arbitrary values
  }
  if (!ethPriceFeed) {
    console.log("Setting price feed for ETH");
    const priceFeed = FakePriceFeed__factory.connect((await deployments.get("ETHPriceFeed")).address, signer);
    await priceFeed.addRound(1, 3000e6, 2, 4, 1); // arbitrary values
  }
};

func.tags = ["SetPriceFeeds"];
func.dependencies = ["PriceFeeds"];

export default func;
