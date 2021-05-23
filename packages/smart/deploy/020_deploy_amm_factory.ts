import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isHttpNetworkConfig, makeSigner } from "../tasks";
import { BigNumber } from "ethers";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments } = hre;

  if (!isHttpNetworkConfig(hre.network.config)) throw Error("Cannot deploy to non-HTTP network");

  const signer = await makeSigner(hre);
  const deployer = await signer.getAddress();

  const balancerFactory =
    hre.network.config.deployConfig?.externalAddresses?.balancerFactory || (await deployments.get("BFactory")).address;

  const swapFee = BigNumber.from(10).pow(15).mul(15); // 1.5%

  await deployments.deploy("AMMFactory", {
    from: deployer,
    args: [balancerFactory, swapFee],
    log: true,
  });
};

func.tags = ["AMMFactory"];
func.dependencies = ["BFactory"];

export default func;
