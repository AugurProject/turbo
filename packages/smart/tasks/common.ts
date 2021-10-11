import { networkNames, NetworkNames } from "../constants";

export function isNetworkName(networkName: string): networkName is NetworkNames {
  for (let i = 0; i < networkNames.length; i++) {
    if (networkNames[i] === networkName) return true;
  }
  return false;
}
