import { HardhatRuntimeEnvironment, HttpNetworkConfig } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isHttpNetworkConfig, makeSigner } from "../tasks";
import { FuturesMarketFactory__factory } from "../typechain";
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

  const args: Parameters<FuturesMarketFactory__factory["deploy"]> = [
    owner,
    collateral.address,
    shareFactor,
    feePot.address,
    fees,
    protocol,
    linkNode,
  ];

  await deployments.deploy("FuturesMarketFactory", {
    from: deployer,
    args,
    log: true,
  });
};

func.tags = ["FuturesMarketFactory"];
func.dependencies = ["Tokens", "FeePot", "BFactory"];

export default func;
