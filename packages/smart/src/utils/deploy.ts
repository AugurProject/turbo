import { BigNumber, BigNumberish } from "ethers";
import { DeploymentsExtension } from "hardhat-deploy/dist/types";
import { calcShareFactor } from "../calcShareFactor";

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
