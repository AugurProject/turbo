import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isHttpNetworkConfig, makeSigner } from "../tasks";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments } = hre;

  const signer = await makeSigner(hre);
  const deployer = await signer.getAddress();

  if (!isHttpNetworkConfig(hre.network.config)) throw Error("Cannot deploy to non-HTTP network");

  if (hre.network.config.deployConfig?.externalAddresses?.usdcToken) {
    console.log(`Using external address for collateral: "${hre.network.config.deployConfig.externalAddresses.usdcToken}"`);
  } else {
    await deployments.deploy("Collateral", {
      contract: "Cash",
      from: deployer,
      args: ["USDC", "USDC", 6],
      log: true,
    });
  }

  if (hre.network.config.deployConfig?.externalAddresses?.reputationToken) {
    console.log(`Using external address for reputation token: "${hre.network.config.deployConfig.externalAddresses.reputationToken}"`);
  } else {
    await deployments.deploy("Reputation", {
      contract: "Cash",
      from: deployer,
      args: ["REPv2", "REPv2", 18],
      log: true,
    });
  }
};

func.tags = ["Tokens"];

export default func;
