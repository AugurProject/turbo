import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { BigNumber } from "ethers";
import { calcShareFactor } from "../src";
import { isHttpNetworkConfig, makeSigner } from "../tasks";
import { Cash__factory, CryptoMarketFactory__factory } from "../typechain";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments } = hre;

  if (!isHttpNetworkConfig(hre.network.config)) {
    return; // skip tests and internal deploy
  }

  const signer = await makeSigner(hre);
  const deployer = await signer.getAddress();

  const collateralAddress =
    hre.network.config.deployConfig?.externalAddresses?.usdcToken || (await deployments.get("Collateral")).address;
  const collateral = Cash__factory.connect(collateralAddress, signer);
  const shareFactor = calcShareFactor(await collateral.decimals());

  const feePot = await deployments.get("FeePot");
  const stakerFee = 0;
  const settlementFee = BigNumber.from(10).pow(14).mul(5); // 0.05%
  const protocolFee = 0;

  const owner = hre.network.config.deployConfig?.owner || deployer;
  const protocol = hre.network.config.deployConfig?.protocol || deployer;
  const linkNode = hre.network.config.deployConfig?.linkNode || deployer;

  const firstResolutionTime = getUpcomingFriday4pmEst().valueOf();
  const cadence = 60 * 60 * 24 * 7; // one week

  const args: Parameters<CryptoMarketFactory__factory["deploy"]> = [
    owner,
    collateral.address,
    shareFactor,
    feePot.address,
    stakerFee,
    settlementFee,
    protocol,
    protocolFee,
    linkNode,
    firstResolutionTime,
    cadence,
  ];

  await deployments.deploy("CryptoMarketFactory", {
    from: deployer,
    args,
    log: true,
  });
};

// 4pm EST is 8PM UTC, same day
function getUpcomingFriday4pmEst(): Date {
  const FRIDAY = 5;
  const FOUR_PM_EST = 20; // UTC

  const d = new Date();

  // set date
  const today = d.getUTCDay();
  let dateAdjustment = FRIDAY - today;
  if (dateAdjustment < 0) dateAdjustment += 7;
  d.setUTCDate(d.getUTCDate() + dateAdjustment); // Date.setDate rolls over to the next month if needed

  // set hour
  const thisHour = d.getUTCHours()
  let hoursAdjustment = FOUR_PM_EST - thisHour;
  if (hoursAdjustment < 0) hoursAdjustment += 24;
  d.setUTCHours(thisHour + hoursAdjustment);

  // set minutes etc
  d.setUTCMinutes(0);
  d.setUTCSeconds(0)
  d.setUTCMilliseconds(0)

  return d;
}

func.tags = ["CryptoMarketFactory"];
func.dependencies = ["Tokens", "FeePot"];

export default func;
