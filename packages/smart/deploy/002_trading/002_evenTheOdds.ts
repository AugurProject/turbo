import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deployer } = await getNamedAccounts();

  await deployments.deploy("EvenTheOdds", {
    from: deployer,
    log: true,
  });
};

func.tags = ["EvenTheOdds"];
func.dependencies = [];

export default func;
