import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { deployMarketFactory } from "../../src/utils/deploy";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  await deployMarketFactory(hre, "NFLMarketFactoryV3");
};

func.tags = ["Sports", "NFLMarketFactory"];
func.dependencies = ["Tokens", "FeePot", "BFactory"];

export default func;
