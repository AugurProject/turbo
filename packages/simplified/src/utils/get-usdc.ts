import { USDC } from "modules/constants";
import { Cashes } from "modules/types";

export default function getUSDC(cashes: Cashes) {
  return Object.entries(cashes).find((cash) => cash[1].name === USDC)[1];
}
