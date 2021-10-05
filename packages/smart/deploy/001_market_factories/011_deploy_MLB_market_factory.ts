import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { deployMarketFactory } from "../../src/utils/deploy";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  await deployMarketFactory(hre, "MLBMarketFactoryV3");
};

func.tags = ["Sports", "MLBMarketFactory"];
func.dependencies = ["Tokens", "FeePot", "BFactory"];

export default func;
