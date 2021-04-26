import {
  AMMFactory,
  AMMFactory__factory,
  Cash,
  Cash__factory,
  PriceMarketFactory,
  PriceMarketFactory__factory,
  SportsLinkMarketFactory,
  SportsLinkMarketFactory__factory,
  TrustedMarketFactory,
  TrustedMarketFactory__factory,
} from "./typechain";
import { addresses, ChainId } from "./addresses";
import { Signer } from "ethers";
import { Provider } from "@ethersproject/providers";
import { mapOverObject } from "./src";

export * from "./typechain";
export * from "./addresses";
export { calcSellCompleteSets } from "./src/bmath";

export { mapOverObject } from "./src/utils/common-functions"; // TODO this shouldn't live in this package

export interface ContractInterfaces {
  AMMFactory: AMMFactory;
  ReputationToken: Cash;
  MarketFactories: {
    [name: string]: MarketFactoryContract;
  };
  // TheRundownChainlink: TheRundownChainlink;
}
export type MarketFactoryContract = SportsLinkMarketFactory | TrustedMarketFactory | PriceMarketFactory;

export function buildContractInterfaces(signerOrProvider: Signer | Provider, chainId: ChainId): ContractInterfaces {
  const contractAddresses = addresses[chainId];
  if (typeof contractAddresses === "undefined") throw new Error(`Addresses for chain ${chainId} not found.`);

  console.log(contractAddresses.marketFactories);

  const MarketFactories = mapOverObject(contractAddresses.marketFactories, (name, { type, address }) => {
    let contract: MarketFactoryContract;
    switch (type) {
      case "SportsLink":
        contract = SportsLinkMarketFactory__factory.connect(address, signerOrProvider);
        break;
      case "Trusted":
        contract = TrustedMarketFactory__factory.connect(address, signerOrProvider);
        break;
      case "Price":
        contract = PriceMarketFactory__factory.connect(address, signerOrProvider);
        break;
    }
    return [name, contract];
  });

  return {
    AMMFactory: AMMFactory__factory.connect(contractAddresses.ammFactory, signerOrProvider),
    ReputationToken: Cash__factory.connect(contractAddresses.reputationToken, signerOrProvider),
    MarketFactories,
    // TheRundownChainlink: TheRundownChainlink__factory.connect(contractAddresses.theRundownChainlink, signerOrProvider),
  };
}
