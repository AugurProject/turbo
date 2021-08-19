import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { BigNumber } from "ethers";
import { calcShareFactor } from "../src";
import { NFLMarketFactory__factory } from "../typechain";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deployer, linkNode, owner, protocol } = await getNamedAccounts();

  const { address: collateralAddress } = await deployments.get("Collateral");
  const shareFactor = calcShareFactor(await deployments.read("Collateral", "decimals"));

  const { address: feePotAddress } = await deployments.get("FeePot");
  const stakerFee = 0;
  const settlementFee = BigNumber.from(10).pow(14).mul(5); // 0.05%
  const protocolFee = 0;

  const sportId = 1;

  const args: Parameters<NFLMarketFactory__factory["deploy"]> = [
    owner,
    collateralAddress,
    shareFactor,
    feePotAddress,
    stakerFee,
    settlementFee,
    protocol,
    protocolFee,
    linkNode,
    sportId,
  ];

  await deployments.deploy("NFLMarketFactory", {
    from: deployer,
    args,
    log: true,
  });
};

func.tags = ["NFLMarketFactory"];
func.dependencies = ["Tokens", "FeePot", "BFactory"];
export default func;
