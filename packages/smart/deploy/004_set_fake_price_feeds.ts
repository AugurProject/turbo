import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isHttpNetworkConfig, makeSigner } from "../tasks";
import { FakePriceFeed__factory } from "../typechain";
import { FAKE_COINS } from "../src";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  if (!isHttpNetworkConfig(hre.network.config)) throw Error("Cannot deploy to non-HTTP network");
  const { deployments } = hre;
  const signer = await makeSigner(hre);

  if (hre.network.config.deployConfig?.externalAddresses?.priceFeeds) {
    console.log("Not configuring fake price feeds because real ones were specified");
  }

  for (const coin of FAKE_COINS) {
    const address = (await deployments.get(coin.deploymentName)).address;
    const priceFeed = FakePriceFeed__factory.connect(address, signer);
    const data = await priceFeed.latestRoundData();
    if (!data._answer.eq(0)) {
      console.log(`Skipping setting price feed for ${coin.symbol} because it's already set`);
      continue;
    }

    console.log(`Setting price feed for ${coin.symbol} to ${address}`);
    await priceFeed.addRound(1, coin.price, 2, 4, 1); // arbitrary values
  }
};

func.tags = ["SetPriceFeeds"];
func.dependencies = ["PriceFeeds"];

export default func;
