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
import { addresses, ChainId } from "./addresses";
import { Signer } from "ethers";
import { Provider } from "@ethersproject/providers";
import { mapOverObject } from "./src";

export * from "./typechain";
export * from "./addresses";
export { calcSellCompleteSets, estimateBuy } from "./src/bmath";

export { mapOverObject } from "./src/utils/common-functions"; // TODO this shouldn't live in this package

export interface ContractInterfaces {
  ReputationToken: Cash;
  MarketFactories: {
    [name: string]: {
      marketFactory: MarketFactoryContract;
      ammFactory: AMMFactory;
    };
  };
}
export type MarketFactoryContract = SportsLinkMarketFactory | TrustedMarketFactory | TestPriceMarketFactory;

export function buildContractInterfaces(signerOrProvider: Signer | Provider, chainId: ChainId): ContractInterfaces {
  const contractAddresses = addresses[chainId];
  if (typeof contractAddresses === "undefined") throw new Error(`Addresses for chain ${chainId} not found.`);

  console.log(contractAddresses.marketFactories);

  const MarketFactories = mapOverObject(
    contractAddresses.marketFactories,
    (name, { type, address, ammFactory: ammFactoryAddress }) => {
      let marketFactory: MarketFactoryContract;
      switch (type) {
        case "SportsLink":
          marketFactory = SportsLinkMarketFactory__factory.connect(address, signerOrProvider);
          break;
        case "Trusted":
          marketFactory = TrustedMarketFactory__factory.connect(address, signerOrProvider);
          break;
        case "Price":
          marketFactory = TestPriceMarketFactory__factory.connect(address, signerOrProvider);
          break;
      }
      const ammFactory = AMMFactory__factory.connect(ammFactoryAddress, signerOrProvider);
      return [name, { marketFactory, ammFactory }];
    }
  );

  return {
    ReputationToken: Cash__factory.connect(contractAddresses.reputationToken, signerOrProvider),
    MarketFactories,
    // TheRundownChainlink: TheRundownChainlink__factory.connect(contractAddresses.theRundownChainlink, signerOrProvider),
  };
}
