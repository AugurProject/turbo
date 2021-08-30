import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { NBAMarketFactory__factory } from "../typechain";
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
    const args: Parameters<NBAMarketFactory__factory["deploy"]> = [
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

  await deployMarketFactory("NBAMarketFactory");
  await deployMarketFactory("MLBMarketFactory");
  await deployMarketFactory("MMAMarketFactory");
  await deployMarketFactory("NFLMarketFactory");

  // all sports can use the same fetcher
  await deployments.deploy("NBAFetcher", {
    from: deployer,
    args: [],
    log: true,
  });
};

func.tags = ["Sports"];
func.dependencies = ["Tokens", "FeePot", "BFactory"];

export default func;
