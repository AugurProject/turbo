import {
  AMMFactory,
  AMMFactory__factory,
  Cash,
  Cash__factory,
  TrustedMarketFactory,
  TrustedMarketFactory__factory,
  TheRundownChainlink,
  TheRundownChainlink__factory,
} from "./typechain";
import { addresses, ChainId } from "./addresses";
import { Signer } from "ethers";
import { Provider } from "@ethersproject/providers";

export * from "./typechain";
export * from "./addresses";

export { mapOverObject } from "./src/utils/common-functions"; // TODO this shouldn't live in this package

export interface ContractInterfaces {
  AMMFactory: AMMFactory;
  MarketFactory: TrustedMarketFactory;
  ReputationToken: Cash;
  TheRundownChainlink: TheRundownChainlink;
}

export function buildContractInterfaces(signerOrProvider: Signer | Provider, chainId: ChainId): ContractInterfaces {
  const contractAddresses = addresses[chainId];
  if (typeof contractAddresses === "undefined") throw new Error(`Addresses for chain ${chainId} not found.`);

  return {
    AMMFactory: AMMFactory__factory.connect(contractAddresses.ammFactory, signerOrProvider),
    MarketFactory: TrustedMarketFactory__factory.connect(contractAddresses.marketFactory, signerOrProvider),
    ReputationToken: Cash__factory.connect(contractAddresses.reputationToken, signerOrProvider),
    TheRundownChainlink: TheRundownChainlink__factory.connect(contractAddresses.theRundownChainlink, signerOrProvider),
  };
}
