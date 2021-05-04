import { BigNumber, BigNumberish } from "ethers";

// Decimals is the decimals of the collateral. Usually 18; is 6 for USDC.
export function calcShareFactor(decimals: BigNumberish): BigNumber {
  decimals = BigNumber.from(decimals);
  const power = decimals.gte(18) ? 0 : BigNumber.from(18).sub(decimals);
  return BigNumber.from(10).pow(power);
}
