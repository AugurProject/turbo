import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { deployMarketFactory } from "../../src/utils/deploy";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  await deployMarketFactory(hre, "MMAMarketFactoryV3");
};

func.tags = ["Sports", "MMAMarketFactory"];
func.dependencies = ["Tokens", "FeePot", "BFactory"];

export default func;
