import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { PRICE_FEEDS } from "../../src";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deployer } = await getNamedAccounts();

  const version = 3; // arbitrary
  for (const coin of PRICE_FEEDS) {
    if (!(await deployments.getOrNull(coin.deploymentName))) {
      await deployments.deploy(coin.deploymentName, {
        contract: "FakePriceFeed",
        from: deployer,
        args: [coin.decimals, coin.description, version],
        log: true,
      });
    }
  }
};

func.tags = ["PriceFeeds", "Test"];

export default func;
