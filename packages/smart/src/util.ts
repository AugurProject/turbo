import { ethers } from "ethers";

export function mapOverObject<V1, V2>(
  o: { [k: string]: V1 },
  fn: (k: string, v: V1) => [string, V2]
): { [k: string]: V2 } {
  const o2: { [k: string]: V2 } = {};
  for (const key in o) {
    const value = o[key];
    const [k, v] = fn(key, value);
    o2[k] = v;
  }
  return o2;
}

export type RecursivePartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer U>
    ? Array<RecursivePartial<U>>
    : T[P] extends Record<string, unknown>
    ? RecursivePartial<T[P]>
    : T[P];
};

export async function sleep(milliseconds: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

export const DEAD_ADDRESS = "0x000000000000000000000000000000000000DEAD";
export const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";

export enum MarketTypes {
  YES_NO,
  CATEGORICAL,
  SCALAR,
}

export const MAX_UINT256 = ethers.BigNumber.from(2).pow(256).sub(1);
