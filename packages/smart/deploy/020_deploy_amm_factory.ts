import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { makeSigner } from "../tasks";
import { BigNumber } from "ethers";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments } = hre;

  const signer = await makeSigner(hre);
  const deployer = await signer.getAddress();

  const balancerFactory = await deployments.get("BFactory");
  const swapFee = BigNumber.from(10).pow(15).mul(15); // 1.5%

  await deployments.deploy("AMMFactory", {
    from: deployer,
    args: [balancerFactory.address, swapFee],
    log: true,
  });
};

func.tags = ["AMMFactory"];
func.dependencies = ["BFactory"];

export default func;
