import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { BigNumber } from "ethers";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deployer } = await getNamedAccounts();

  const { address: balancerFactoryAddress } = await deployments.get("BFactory");

  const BONE = BigNumber.from(10).pow(18);
  const swapFee = BONE.div(BigNumber.from(10).pow(6)); // The bpool min fee

  await deployments.deploy("AMMFactory", {
    from: deployer,
    args: [balancerFactoryAddress, swapFee],
    log: true,
  });
};

func.tags = ["AMMFactory"];
func.dependencies = [
  "BFactory",
  "SportsLinkMarketFactory",
  "MMALinkMarketFactory",
  "CryptoMarketFactoryV3",
  "NFLMarketFactoryV3",
];

export default func;
