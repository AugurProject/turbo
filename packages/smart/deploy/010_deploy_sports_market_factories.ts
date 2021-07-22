import { HardhatRuntimeEnvironment, HttpNetworkConfig } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isHttpNetworkConfig, makeSigner } from "../tasks";
import { NBAMarketFactory__factory } from "../typechain";
import { MarketFactoryContractName } from "../addresses";
import { getCollateral, getFees, getSpecialAddresses } from "../src/utils/deploy";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  if (!isHttpNetworkConfig(hre.network.config)) return;

  const { deployments } = hre;
  const config: HttpNetworkConfig = hre.network.config;
  const signer = await makeSigner(hre);
  const deployer = await signer.getAddress();
  const feePot = await deployments.get("FeePot");
  const { collateral, shareFactor } = await getCollateral(signer, deployments, config);
  const { owner, protocol, linkNode } = getSpecialAddresses(config, deployer);
  const fees = getFees();

  async function deployMarketFactory(marketFactoryName: MarketFactoryContractName) {
    // all sports constructors have the same parameters
    const args: Parameters<NBAMarketFactory__factory["deploy"]> = [
      owner,
      collateral.address,
      shareFactor,
      feePot.address,
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
