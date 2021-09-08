import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { BigNumber } from "ethers";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deployer } = await getNamedAccounts();

  const { address: balancerFactoryAddress } = await deployments.get("BFactory");

  const swapFee = BigNumber.from(10).pow(15).mul(15); // 1.5%

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
