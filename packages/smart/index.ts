import {
  AMMFactory,
  AMMFactory__factory,
  Cash,
  Cash__factory,
  TestPriceMarketFactory,
  TestPriceMarketFactory__factory,
  SportsLinkMarketFactory,
  SportsLinkMarketFactory__factory,
  TrustedMarketFactory,
  TrustedMarketFactory__factory,
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
  }[];
}
export type MarketFactoryContract = SportsLinkMarketFactory | TrustedMarketFactory | TestPriceMarketFactory;

export function buildContractInterfaces(signerOrProvider: Signer | Provider, chainId: ChainId): ContractInterfaces {
  const contractAddresses = addresses[chainId];
  if (typeof contractAddresses === "undefined") throw new Error(`Addresses for chain ${chainId} not found.`);

  console.log(contractAddresses.marketFactories);

  const MarketFactories = contractAddresses.marketFactories.map(({ type, address, ammFactory: ammFactoryAddress }) => {
    const marketFactory: MarketFactoryContract = instantiateMarketFactory(type, address, signerOrProvider);
    const ammFactory = AMMFactory__factory.connect(ammFactoryAddress, signerOrProvider);
    return { marketFactory, ammFactory };
  });

  return {
    ReputationToken: Cash__factory.connect(contractAddresses.reputationToken, signerOrProvider),
    MarketFactories,
  };
}

function instantiateMarketFactory(
  type: MarketFactoryType,
  address: string,
  signerOrProvider: Signer | Provider
): MarketFactoryContract {
  switch (type) {
    case "SportsLink":
      return SportsLinkMarketFactory__factory.connect(address, signerOrProvider);
    case "Trusted":
      return TrustedMarketFactory__factory.connect(address, signerOrProvider);
    case "Price":
      return TestPriceMarketFactory__factory.connect(address, signerOrProvider);
  }
}
