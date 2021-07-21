import {
  AMMFactory,
  AMMFactory__factory,
  Cash,
  Cash__factory,
  SportsLinkMarketFactoryV2,
  SportsLinkMarketFactoryV2__factory,
  TrustedMarketFactory,
  TrustedMarketFactory__factory,
  CryptoMarketFactory__factory,
  CryptoMarketFactory,
  MMALinkMarketFactory,
  MMALinkMarketFactory__factory,
} from "./typechain";
import { addresses, ChainId, MarketFactoryType } from "./addresses";
import { Signer } from "ethers";
import { Provider } from "@ethersproject/providers";

export * from "./typechain";
export * from "./addresses";
export { calcSellCompleteSets, estimateBuy } from "./src/bmath";
export { mapOverObject } from "./src/utils/common-functions";

export interface ContractInterfaces {
  ReputationToken: Cash;
  MarketFactories: {
    marketFactory: MarketFactoryContract;
    ammFactory: AMMFactory;
    marketFactoryType: MarketFactoryType;
  }[];
}
export type MarketFactoryContract =
  | SportsLinkMarketFactoryV2
  | MMALinkMarketFactory
  | TrustedMarketFactory
  | CryptoMarketFactory;

export function buildContractInterfaces(signerOrProvider: Signer | Provider, chainId: ChainId): ContractInterfaces {
  const contractAddresses = addresses[chainId];
  if (typeof contractAddresses === "undefined") throw new Error(`Addresses for chain ${chainId} not found.`);

  const MarketFactories = contractAddresses.marketFactories.map(({ type, address, ammFactory: ammFactoryAddress }) => {
    const marketFactory: MarketFactoryContract = instantiateMarketFactory(type, address, signerOrProvider);
    const ammFactory = AMMFactory__factory.connect(ammFactoryAddress, signerOrProvider);
    return { marketFactory, ammFactory, marketFactoryType: type };
  });

  return {
    ReputationToken: Cash__factory.connect(contractAddresses.reputationToken, signerOrProvider),
    MarketFactories,
  };
}

export function instantiateMarketFactory(
  type: MarketFactoryType,
  address: string,
  signerOrProvider: Signer | Provider
): MarketFactoryContract {
  switch (type) {
    case "SportsLink":
      return SportsLinkMarketFactoryV2__factory.connect(address, signerOrProvider);
    case "MMALink":
      return MMALinkMarketFactory__factory.connect(address, signerOrProvider);
    case "Trusted":
      return TrustedMarketFactory__factory.connect(address, signerOrProvider);
    case "Crypto":
      return CryptoMarketFactory__factory.connect(address, signerOrProvider);
  }
}
