import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { FakePriceFeed__factory } from "../typechain";
import { PRICE_FEEDS } from "../src";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deployer } = await getNamedAccounts();

  const signer = await hre.ethers.getSigner(deployer);

  for (const {deploymentName, symbol, price} of PRICE_FEEDS) {
    const { address } = await deployments.get(deploymentName);
    const priceFeed = FakePriceFeed__factory.connect(address, signer);

    const data = await priceFeed.latestRoundData();

    if (!data._answer.eq(0)) {
      console.log(`Skipping setting price feed for ${symbol} because it's already set`);
      continue;
    }

    console.log(`Setting price feed for ${symbol} to ${price}`);
    await priceFeed.addRound(1, price, 2, 4, 1); // arbitrary values
  }
};

func.tags = ["SetPriceFeeds"];
func.dependencies = ["PriceFeeds"];

export default func;
