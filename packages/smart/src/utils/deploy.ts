import { BigNumber, BigNumberish, Signer } from "ethers";
import { HttpNetworkConfig } from "hardhat/types";
import { DeploymentsExtension } from "hardhat-deploy/dist/types";
import { Cash__factory } from "../../typechain";
import { calcShareFactor } from "../calcShareFactor";

export async function getCollateral(signer: Signer, deployments: DeploymentsExtension, config: HttpNetworkConfig) {
  const collateralAddress =
    config.deployConfig?.externalAddresses?.usdcToken || (await deployments.get("Collateral")).address;
  const collateral = Cash__factory.connect(collateralAddress, signer);
  const shareFactor = calcShareFactor(await collateral.decimals());

  return { collateral, shareFactor };
}

export function getFees(): [BigNumberish, BigNumberish, BigNumberish] {
  const stakerFee = 0;
  const settlementFee = BigNumber.from(10).pow(14).mul(5); // 0.05%
  const protocolFee = 0;
  return [stakerFee, settlementFee, protocolFee];
}

export function getSpecialAddresses(config: HttpNetworkConfig, defaultAddress: string) {
  const owner = config.deployConfig?.owner || defaultAddress;
  const protocol = config.deployConfig?.protocol || defaultAddress;
  const linkNode = config.deployConfig?.linkNode || defaultAddress;
  return { owner, protocol, linkNode };
}
