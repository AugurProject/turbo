import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { BigNumber } from "ethers";
import { calcShareFactor } from "../src";
import { SportsLinkMarketFactoryV2__factory } from "../typechain";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deployer, linkNode, owner, protocol } = await getNamedAccounts();

  const collateralAddress = (await deployments.get("Collateral")).address;
  const shareFactor = calcShareFactor(await deployments.read("Collateral", "decimals"));

  const feePot = await deployments.get("FeePot");
  const stakerFee = 0;
  const settlementFee = BigNumber.from(10).pow(14).mul(5); // 0.05%
  const protocolFee = 0;

  const sportId = 4;

  const args: Parameters<SportsLinkMarketFactoryV2__factory["deploy"]> = [
    owner,
    collateralAddress,
    shareFactor,
    feePot.address,
    stakerFee,
    settlementFee,
    protocol,
    protocolFee,
    linkNode,
    sportId,
  ];

  await deployments.deploy("SportsLinkMarketFactory", {
    from: deployer,
    contract: "SportsLinkMarketFactoryV2",
    args,
    log: true,
  });

  await deployments.deploy("NBAFetcher", {
    from: deployer,
    args: [],
    log: true,
  });
};

func.tags = ["SportsLinkMarketFactory"];
func.dependencies = ["Tokens", "FeePot", "BFactory"];

export default func;
