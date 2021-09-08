import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { NBAMarketFactoryV3__factory } from "../typechain";
import { MarketFactoryContractName } from "../addresses";
import { getCollateral, getFees } from "../src/utils/deploy";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deployer, linkNode, protocol, owner } = await getNamedAccounts();

  const { collateralAddress, shareFactor } = await getCollateral(deployments);
  const { address: feePotAddress } = await deployments.get("FeePot");
  const fees = getFees();

  async function deployMarketFactory(marketFactoryName: MarketFactoryContractName) {
    // all sports constructors have the same parameters
    const args: Parameters<NBAMarketFactoryV3__factory["deploy"]> = [
      owner,
      collateralAddress,
      shareFactor,
      feePotAddress,
      fees,
      protocol,
      linkNode,
    ];
    await deployments.deploy(marketFactoryName, {
      from: deployer,
      contract: marketFactoryName,
      args,
      log: true,
    });
  }

  await deployMarketFactory("NBAMarketFactoryV3");
  await deployMarketFactory("MLBMarketFactoryV3");
  await deployMarketFactory("MMAMarketFactoryV3");
  await deployMarketFactory("NFLMarketFactoryV3");

  // all sports can use the same fetcher
  await deployments.deploy("NBAFetcher", {
    from: deployer,
    args: [],
    log: true,
  });
};

func.tags = ["Sports", "NBAMarketFactory", "MLBMarketFactory", "MMAMarketFactory", "NFLMarketFactory"];
func.dependencies = ["Tokens", "FeePot", "BFactory"];

export default func;
