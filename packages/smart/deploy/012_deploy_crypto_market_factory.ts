import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { BigNumber } from "ethers";
import { calcShareFactor } from "../src";
import { CryptoMarketFactory__factory } from "../typechain";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deployer, linkNode, owner, protocol } = await getNamedAccounts();

  const { address: collateralAddress } = await deployments.get("Collateral");
  const { address: feePotAddress } = await deployments.get("FeePot");

  const shareFactor = calcShareFactor(await deployments.read("Collateral", "decimals"));

  const stakerFee = 0;
  const settlementFee = BigNumber.from(10).pow(14).mul(5); // 0.05%
  const protocolFee = 0;

  const args: Parameters<CryptoMarketFactory__factory["deploy"]> = [
    deployer, // initial owner must be deployer for coins to be addable
    collateralAddress,
    shareFactor,
    feePotAddress,
    stakerFee,
    settlementFee,
    protocol,
    protocolFee,
    linkNode,
  ];

  await deployments.deploy("CryptoMarketFactory", {
    from: deployer,
    args,
    log: true,
  });
};

func.tags = ["CryptoMarketFactory"];
func.dependencies = ["Tokens", "FeePot", "BFactory"];

export default func;
