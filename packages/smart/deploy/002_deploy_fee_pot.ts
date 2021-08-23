import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deployer } = await getNamedAccounts();

  const collateral = (await deployments.get("Collateral")).address;
  const reputationToken = (await deployments.get("Reputation")).address;

  console.log(collateral, reputationToken);

  await deployments.deploy("FeePot", {
    from: deployer,
    args: [collateral, reputationToken],
    log: true,
  });
};

func.tags = ["FeePot"];
func.dependencies = ["Tokens"];

export default func;
