import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { BigNumber } from "ethers";
import { calcShareFactor } from "../src";
import { makeSigner } from "../tasks";
import { Cash, SportsLinkMarketFactory__factory } from "../typechain";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, ethers } = hre;

  const signer = await makeSigner(hre);
  const deployer = await signer.getAddress();

  const collateral = (await ethers.getContract("Collateral")) as Cash;
  const shareFactor = calcShareFactor(await collateral.decimals());

  const feePot = await deployments.get("FeePot");
  const stakerFee = 0;
  const settlementFee = BigNumber.from(10).pow(14).mul(5); // 0.005%
  const protocolFee = 0;

  // These should be specified but they're changeable so setting them to deployer is OK.
  const owner = deployer;
  const protocol = deployer;
  const linkNode = deployer;

  const args: Parameters<SportsLinkMarketFactory__factory["deploy"]> = [
    owner,
    collateral.address,
    shareFactor,
    feePot.address,
    stakerFee,
    settlementFee,
    protocol,
    protocolFee,
    linkNode,
  ];

  await deployments.deploy("SportsLinkMarketFactory", {
    from: deployer,
    args,
    log: true,
  });
};

func.tags = ["SportsLinkMarketFactory"];
func.dependencies = ["Tokens", "FeePot"];

export default func;
