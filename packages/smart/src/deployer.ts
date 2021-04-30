import {
  AbstractMarketFactory,
  AMMFactory,
  AMMFactory__factory,
  BFactory,
  BFactory__factory,
  BPool,
  BPool__factory,
  Cash,
  Cash__factory,
  FeePot,
  FeePot__factory,
  SportsLinkMarketFactory,
  SportsLinkMarketFactory__factory,
  TheRundownChainlink,
  TheRundownChainlink__factory,
  TrustedMarketFactory,
  TrustedMarketFactory__factory,
} from "../typechain";
import { BigNumberish, Contract, Signer, BigNumber } from "ethers";
import { Addresses, Collateral, MarketFactories, MarketFactory } from "../addresses";

const BASIS = BigNumber.from(10).pow(18);
export const swapFee = BigNumber.from(10).pow(15).mul(15); // 1.5%

export class Deployer {
  constructor(readonly signer: Signer, public confirmations: number = 0) {}

  // Deploys the test contracts (faucets etc)
  async deployTest(): Promise<Deploy> {
    const collateralConfig: Collateral = {
      address: "",
      name: "USDC",
      symbol: "USDC",
      decimals: 6,
    };

    console.log("Deploying test contracts");
    const collateral = await this.deployCollateral(
      collateralConfig.name,
      collateralConfig.symbol,
      collateralConfig.decimals
    );
    collateralConfig.address = collateral.address;

    const reputationToken = await this.deployCollateral("REPv2", "REPv2", 18);
    const balancerFactory = await this.deployBalancerFactory();

    // TODO this needs to accept external addrs for linkToken and linkOracle, so deploy will work outside of kovan
    //      https://github.com/AugurProject/turbo/issues/158
    // const theRundownChainlink = await this.deployTheRundownChainlink();

    console.log("Deploying AMMFactory, which works for all market factories");
    const ammFactory = await this.deployAMMFactory(balancerFactory.address, swapFee);

    console.log("Deploying feepot for test collateral");
    const feePot = await this.deployFeePot(collateral.address, reputationToken.address);
    const stakerFee = 0;
    const settlementFee = BigNumber.from(10).pow(15).mul(5); // 0.5%
    const protocolFee = 0;

    const marketFactories: MarketFactories = {};

    console.log("Deploying market factories");
    marketFactories["sportsball"] = await this.deploySportsLinkMarketFactory(
      collateralConfig,
      feePot.address,
      stakerFee,
      settlementFee,
      protocolFee
    );
    marketFactories["trustme"] = await this.deployTrustedMarketFactory(
      collateralConfig,
      feePot.address,
      stakerFee,
      settlementFee,
      protocolFee
    );

    console.log("Done deploying!");

    return {
      addresses: {
        reputationToken: reputationToken.address,
        balancerFactory: balancerFactory.address,
        ammFactory: ammFactory.address,
        marketFactories,
      },
    };
  }

  async deployProduction(externalAddresses: ContractDeployExternalAddresses): Promise<Deploy> {
    throw Error("Production deploy not yet implemented");
  }

  async createPriceMarket(balancerFactory: BFactory, collateral: Cash, reputationToken: Cash): Promise<BPool> {
    const priceMarketPool = BPool__factory.connect(await balancerFactory.callStatic.newBPool(), this.signer);
    await balancerFactory.newBPool(); // TODO be more certain since this isn't guaranteed to work w/ the callstatic

    const amount = BASIS.mul(1000);
    await collateral.faucet(amount);
    await collateral.approve(priceMarketPool.address, amount);
    await reputationToken.faucet(amount);
    await reputationToken.approve(priceMarketPool.address, amount);

    await priceMarketPool.bind(collateral.address, amount, BASIS);
    await priceMarketPool.bind(reputationToken.address, amount, BASIS);

    return priceMarketPool;
  }

  async deployCollateral(name: string, symbol: string, decimals: BigNumberish): Promise<Cash> {
    return this.deploy(name, () => new Cash__factory(this.signer).deploy(name, symbol, decimals));
  }

  async deploySportsLinkMarketFactory(
    collateral: Collateral,
    feePot: string,
    stakerFee: BigNumberish,
    settlementFee: BigNumberish,
    protocolFee: BigNumberish
  ): Promise<MarketFactory> {
    const owner = await this.signer.getAddress();
    const shareFactor = calcShareFactor(collateral.decimals);

    const constructorArgs = [
      owner,
      collateral.address,
      shareFactor.toString(),
      feePot,
      stakerFee.toString(),
      settlementFee.toString(),
      owner, // protocol, but just use owner for now
      protocolFee.toString(),
      owner, // link node, but just use owner for now
    ];

    const contract = await this.deploy(
      "sportsLinkMarketFactory",
      () =>
        (new SportsLinkMarketFactory__factory(this.signer) as any).deploy(
          ...constructorArgs
        ) as Promise<SportsLinkMarketFactory>
    );
    return {
      type: "SportsLink",
      address: contract.address,
      constructorArgs,
      collateral,
    };
  }

  async deployTrustedMarketFactory(
    collateral: Collateral,
    feePot: string,
    stakerFee: BigNumberish,
    settlementFee: BigNumberish,
    protocolFee: BigNumberish,
  ): Promise<MarketFactory> {
    const owner = await this.signer.getAddress();
    const shareFactor = calcShareFactor(collateral.decimals);
    const constructorArgs = [
      owner,
      collateral.address,
      shareFactor.toString(),
      feePot,
      stakerFee.toString(),
      settlementFee.toString(),
      owner, // protocol, but just use owner for now
      protocolFee.toString(),
    ];
    const contract = await this.deploy(
      "trustedMarketFactory",
      () =>
        (new TrustedMarketFactory__factory(this.signer) as any).deploy(
          ...constructorArgs
        ) as Promise<TrustedMarketFactory>
    );
    return {
      type: "Trusted",
      address: contract.address,
      constructorArgs,
      collateral,
    };
  }

  async deployTheRundownChainlink(): Promise<TheRundownChainlink> {
    return this.deploy("theRundownChainlink", () => new TheRundownChainlink__factory(this.signer).deploy());
  }

  async deployBalancerFactory(): Promise<BFactory> {
    return this.deploy("balancerFactory", () => new BFactory__factory(this.signer).deploy());
  }

  async deployFeePot(collateral: string, reputationToken: string): Promise<FeePot> {
    return this.deploy("feePot", () => new FeePot__factory(this.signer).deploy(collateral, reputationToken));
  }

  async deployAMMFactory(balancerFactory: string, fee: BigNumberish): Promise<AMMFactory> {
    return this.deploy("ammFactory", () => new AMMFactory__factory(this.signer).deploy(balancerFactory, fee));
  }

  async deploy<T extends Contract>(name: string, deployFn: (this: Deployer) => Promise<T>): Promise<T> {
    console.log(`Deploying ${name}`);
    const contract = await deployFn
      .bind(this)()
      .catch((err) => {
        console.error(err);
        throw err;
      });
    await contract.deployTransaction.wait(this.confirmations); // slow but some Arbitrum has issues if you deploy too quickly
    console.log(`Deployed ${name}: ${contract.address} in ${contract.deployTransaction.hash}`);
    return contract;
  }
}

export interface Deploy {
  addresses: Addresses;
}

export type DeployStrategy = "test" | "production";

export type ContractDeployConfig = ContractDeployTestConfig | ContractDeployProductionConfig;

export interface ContractDeployCommonConfig {
  strategy: DeployStrategy;
}

export interface ContractDeployTestConfig extends ContractDeployCommonConfig {
  strategy: "test";
}

export interface ContractDeployProductionConfig extends ContractDeployCommonConfig {
  strategy: "production";
  externalAddresses: ContractDeployExternalAddresses;
}

export interface ContractDeployExternalAddresses {
  reputationToken: string;
}

// Contract Verification

export interface EtherscanVerificationConfig {
  apiKey: string;
}

export function isContractDeployTestConfig(thing?: ContractDeployConfig): thing is ContractDeployTestConfig {
  return thing?.strategy === "test";
}

export function isContractDeployProductionConfig(
  thing?: ContractDeployConfig
): thing is ContractDeployProductionConfig {
  return thing?.strategy === "production";
}

// Decimals is the decimals of the collateral. Usually 18; is 6 for USDC.
export function calcShareFactor(decimals: BigNumberish): BigNumber {
  decimals = BigNumber.from(decimals);
  const power = decimals.gte(18) ? 0 : BigNumber.from(18).sub(decimals);
  return BigNumber.from(10).pow(power);
}
