import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { MasterChef__factory } from "../typechain";
import { BigNumber } from "ethers";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deployer } = await getNamedAccounts();
  const signer = await hre.ethers.getSigner(deployer);

  const masterChefDeploy = await deployments.get("MasterChef");
  const masterChef = MasterChef__factory.connect(masterChefDeploy.address, signer);

  const totalRewardsPerMarket = 195;

  const rewardsPerMarket = BigNumber.from(10)
    .pow(18)
    // 80% goes to daily.
    .mul(totalRewardsPerMarket * 0.8);
  const rewardDaysPerMarket = BigNumber.from(5);
  // 20% goes to early bonus.
  const earlyDepositBonusRewards = BigNumber.from(totalRewardsPerMarket * 0.2);

  await deployments
    .get("CryptoMarketFactoryV3")
    .then(({ address }) =>
      masterChef.addRewards(address, rewardsPerMarket, rewardDaysPerMarket, earlyDepositBonusRewards)
    );
  await deployments
    .get("NBAMarketFactoryV3")
    .then(({ address }) =>
      masterChef.addRewards(address, rewardsPerMarket, rewardDaysPerMarket, earlyDepositBonusRewards)
    );
  await deployments
    .get("MLBMarketFactoryV3")
    .then(({ address }) =>
      masterChef.addRewards(address, rewardsPerMarket, rewardDaysPerMarket, earlyDepositBonusRewards)
    );
  await deployments
    .get("MMAMarketFactoryV3")
    .then(({ address }) =>
      masterChef.addRewards(address, rewardsPerMarket, rewardDaysPerMarket, earlyDepositBonusRewards)
    );
  await deployments
    .get("NFLMarketFactoryV3")
    .then(({ address }) =>
      masterChef.addRewards(address, rewardsPerMarket, rewardDaysPerMarket, earlyDepositBonusRewards)
    );
};

func.tags = ["ApproveMarketFactories"];
func.dependencies = [
  "MasterChef",
  "NBAMarketFactory",
  "MLBMarketFactory",
  "MMAMarketFactory",
  "NFLMarketFactory",
  "CryptoMarketFactory",
];

export default func;
