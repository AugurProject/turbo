import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { CryptoMarketFactory__factory } from "../typechain";
import { getCollateral, getFees } from "../src/utils/deploy";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deployer, linkNode, protocol } = await getNamedAccounts();

  const { collateralAddress, shareFactor } = await getCollateral(deployments);
  const { address: feePotAddress } = await deployments.get("FeePot");
  const fees = getFees();

  const args: Parameters<CryptoMarketFactory__factory["deploy"]> = [
    deployer, // initial owner must be deployer for coins to be addable
    collateralAddress,
    shareFactor,
    feePotAddress,
    fees,
    protocol,
    linkNode,
  ];

  await deployments.deploy("CryptoMarketFactory", {
    from: deployer,
    args,
    log: true,
  });

  await deployments.deploy("CryptoFetcher", {
    from: deployer,
    args: [],
    log: true,
  });
};

func.tags = ["CryptoMarketFactory"];
func.dependencies = ["Tokens", "FeePot", "BFactory"];

export default func;
