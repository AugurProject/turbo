import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { BigNumber } from "ethers";
import { calcShareFactor } from "../src";
import { makeSigner } from "../tasks";
import { Cash } from "../typechain";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, ethers } = hre;

  const signer = await makeSigner(hre);
  const deployer = await signer.getAddress();

  const collateral = (await ethers.getContract("Collateral")) as Cash;
  const shareFactor = calcShareFactor(await collateral.decimals());

  const feePot = await deployments.get("FeePot");
  const stakerFee = BigNumber.from(10).pow(16);
  const creatorFee = BigNumber.from(10).pow(16);

  await deployments.deploy("SportsLinkMarketFactory", {
    from: deployer,
    args: [deployer, collateral.address, shareFactor, feePot.address, stakerFee, creatorFee],
    log: true,
  });
};

func.tags = ["SportsLinkMarketFactory"];
func.dependencies = ["Tokens", "FeePot"];

export default func;
