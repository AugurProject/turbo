import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { makeSigner } from "../tasks";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments } = hre;

  const signer = await makeSigner(hre);
  const deployer = await signer.getAddress();

  // TODO this needs to accept external addrs for linkToken and linkOracle, so deploy will work outside of kovan
  //      https://github.com/AugurProject/turbo/issues/158
  if (["kovan"].includes(hre.network.name)) {
    console.log("Deploying Chainlink contract");
    await deployments.deploy("TheRundownChainlink", {
      from: deployer,
      args: [],
      log: true,
    });
  } else {
    console.log("Skipping deployment of TheRundownChainlink");
  }
};

func.tags = ["TheRundownChainlink"];

export default func;
