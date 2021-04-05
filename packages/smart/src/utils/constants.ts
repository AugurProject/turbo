import { ethers } from "ethers";

export const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";
export const DEAD_ADDRESS = "0x000000000000000000000000000000000000DEAD";

export enum MarketTypes {
  YES_NO,
  CATEGORICAL,
  SCALAR,
}

export const MAX_UINT256 = ethers.BigNumber.from(2).pow(256).sub(1);
