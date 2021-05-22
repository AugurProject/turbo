import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isHttpNetworkConfig, makeSigner } from "../tasks";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments } = hre;

  const signer = await makeSigner(hre);
  const deployer = await signer.getAddress();

  if (!isHttpNetworkConfig(hre.network.config)) throw Error("Cannot deploy to non-HTTP network");

  if (hre.network.config.deployConfig?.externalAddresses?.balancerFactory) {
    console.log(`Using external address for balancer factory: "${hre.network.config.deployConfig.externalAddresses.balancerFactory}"`);
  } else {
    await deployments.deploy("BFactory", {
      from: deployer,
      args: [],
      log: true,
    });
  }
};

func.tags = ["BFactory"];

export default func;
