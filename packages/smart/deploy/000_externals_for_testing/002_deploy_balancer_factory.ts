import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deployer } = await getNamedAccounts();

  if (!(await deployments.getOrNull("BFactory"))) {
    await deployments.deploy("BFactory", {
      from: deployer,
      args: [],
      log: true,
    });
  }
};

func.tags = ["BFactory", "Test"];

export default func;
