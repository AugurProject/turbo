import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deployer } = await getNamedAccounts();

  if (!(await deployments.getOrNull("Collateral"))) {
    await deployments.deploy("Collateral", {
      contract: "Cash",
      from: deployer,
      args: ["USDC", "USDC", 6],
      log: true,
    });
  }
};

func.tags = ["Tokens", "CollateralToken", "Test"];

export default func;
