import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isHttpNetworkConfig, makeSigner } from "../tasks";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments } = hre;

  if (!isHttpNetworkConfig(hre.network.config)) {
    return; // skip tests and internal deploy
  }

  const signer = await makeSigner(hre);
  const deployer = await signer.getAddress();

  const collateral =
    hre.network.config.deployConfig?.externalAddresses?.usdcToken || (await deployments.get("Collateral")).address;
  const reputationToken =
    hre.network.config.deployConfig?.externalAddresses?.reputationToken ||
    (await deployments.get("Reputation")).address;

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
