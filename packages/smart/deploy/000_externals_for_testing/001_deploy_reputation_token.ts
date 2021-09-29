import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deployer } = await getNamedAccounts();

  if (!(await deployments.getOrNull("Reputation"))) {
    await deployments.deploy("Reputation", {
      // contract: "Cash",
      contract: "PlaceholderReputationToken",
      from: deployer,
      args: ["PlaceholderReputationToken", "PlaceholderReputationToken", 18],
      // args: ["REPv2", "REPv2", 18],
      log: true,
    });
  }
};

func.tags = ["Tokens", "ReputationToken", "Test"];

export default func;
