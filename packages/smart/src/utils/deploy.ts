import { BigNumber, BigNumberish } from "ethers";
import { DeploymentsExtension } from "hardhat-deploy/dist/types";
import { calcShareFactor } from "../calcShareFactor";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { MarketFactoryContractName } from "../../constants";
import { NBAMarketFactoryV3__factory } from "../../typechain";

export async function getCollateral(
  deployments: DeploymentsExtension
): Promise<{ shareFactor: BigNumber; collateralAddress: string }> {
  const { address: collateralAddress } = await deployments.get("Collateral");
  const shareFactor = calcShareFactor(await deployments.read("Collateral", "decimals"));

  return { collateralAddress, shareFactor };
}

export function getFees(): [BigNumberish, BigNumberish, BigNumberish] {
  const stakerFee = 0;
  const settlementFee = BigNumber.from(10).pow(14).mul(5); // 0.05%
  const protocolFee = 0;
  return [stakerFee, settlementFee, protocolFee];
}

export async function deployMarketFactory(
  hre: HardhatRuntimeEnvironment,
  marketFactoryName: MarketFactoryContractName
) {
  const { deployments, getNamedAccounts } = hre;
  const { deployer, linkNode, protocol, owner } = await getNamedAccounts();

  const { collateralAddress, shareFactor } = await getCollateral(deployments);
  const { address: feePotAddress } = await deployments.get("FeePot");
  const fees = getFees();

  // all sports constructors have the same parameters
  const args: Parameters<NBAMarketFactoryV3__factory["deploy"]> = [
    owner,
    collateralAddress,
    shareFactor,
    feePotAddress,
    fees,
    protocol,
    linkNode,
  ];
  await deployments.deploy(marketFactoryName, {
    from: deployer,
    contract: marketFactoryName,
    args,
    log: true,
  });
}
