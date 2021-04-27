import { USDC } from "modules/constants";
import { Cashes, Cash } from "@augurproject/comps/build/types";

export default function getUSDC(cashes: Cashes): Cash {
  return Object.entries(cashes).find((cash) => cash[1].name === USDC)[1];
}
