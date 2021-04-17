import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { makeSigner } from "../tasks";
import { network } from "hardhat";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments } = hre;

  const signer = await makeSigner(hre);
  const deployer = await signer.getAddress();

  if (network.ovm) {
    // Deploy a dummy version of the factory to OVM networks
    // Standard version does not fit within the gas limit
    console.log("WARNING: This is NOT a functional deployment of a BFactory!");
    await deployments.deploy("BFactory", {
      contract: "DummyOVMBFactory",
      from: deployer,
      args: [],
      log: true,
    });
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
