import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { makeSigner } from "../tasks";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments } = hre;

  const signer = await makeSigner(hre);
  const deployer = await signer.getAddress();

  const collateral = await deployments.get("Collateral");
  const reputation = await deployments.get("Reputation");

  await deployments.deploy("FeePot", {
    from: deployer,
    args: [collateral.address, reputation.address],
    log: true,
  });
};

func.tags = ["FeePot"];
func.dependencies = ["Tokens"];

export default func;
