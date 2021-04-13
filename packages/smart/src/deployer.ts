import {
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
  AbstractMarketFactory__factory,
  TrustedMarketFactory,
  TrustedMarketFactory__factory,
  TheRundownChainlink,
  TheRundownChainlink__factory,
} from "../typechain";
import { BigNumberish, Contract, Signer, BigNumber } from "ethers";
import { mapOverObject, sleep } from "./utils/common-functions";

const BASIS = BigNumber.from(10).pow(18);

export class Deployer {
  constructor(readonly signer: Signer, public confirmations: number = 0) {}

  // Deploys the test contracts (faucets etc)
  async deployTest(): Promise<Deploy> {
    console.log("Deploying test contracts");
    const collateral = await this.deployCollateral("USDC", "USDC", 6);
    const reputationToken = await this.deployCollateral("REPv2", "REPv2", 18);
    const balancerFactory = await this.deployBalancerFactory();
    const theRundownChainlink = await this.deployTheRundownChainlink();

    console.log("Deploying trusted market factory for REP");
    const feePot = await this.deployFeePot(collateral.address, reputationToken.address);
    const stakerFee = BigNumber.from(10).pow(16);
    const creatorFee = BigNumber.from(10).pow(16);
    const marketFactory = await this.deployTrustedMarketFactory(
      reputationToken.address,
      collateral.address,
      collateral.address,
      feePot.address,
      stakerFee,
      creatorFee
    );

    console.log("Creating a market for testing");
    const duration = 60 * 60 * 24; // one day
    const marketId = await createMarket(
      this.signer,
      marketFactory.address,
      duration,
      "market created with test deploy",
      ["No Contest", "Everyone Dies", "Elves Win", "Orcs Win"],
      this.confirmations
    );
    console.log(`Created market: ${marketId}`);

    console.log("Creating AMM for testing");
    const weights = [
      // each weight must be in the range [1e18,50e18]. max total weight is 50e18
      BASIS.mul(2).div(2), // No Contest at 2%, the lowest possible weight
      BASIS.mul(2).div(2), // Everyone Dies at 2%, the lowest possible weight
      BASIS.mul(48).div(2), // Elves Win at 48%
      BASIS.mul(48).div(2), // Orcs Win at 48%
    ];
    const ammFactory = await this.deployAMMFactory(balancerFactory.address);
    const initialLiquidity = BASIS.mul(1000); // 1000 of the collateral
    console.log("Fauceting collateral for AMM");
    await collateral.faucet(initialLiquidity).then((tx) => tx.wait(this.confirmations));
    console.log("Approving the AMM to spend some of the deployer's collateral");
    await collateral.approve(ammFactory.address, initialLiquidity).then((tx) => tx.wait(this.confirmations));
    console.log("Creating pool");
    await sleep(10000); // matic needs a little time
    await createPool(
      this.signer,
      ammFactory.address,
      marketFactory.address,
      marketId,
      initialLiquidity,
      weights,
      this.confirmations
    );

    console.log("Done deploying!");

    const addresses = mapOverObject(
      {
        collateral,
        reputationToken,
        balancerFactory,
        marketFactory,
        ammFactory,
        theRundownChainlink,
      },
      (name, contract) => [name, contract.address]
    );
    return {
      addresses,
      marketId,
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

  async deployTrustedMarketFactory(
    tokenIn: string,
    tokenOut: string,
    collateral: string,
    feePot: string,
    stakerFee: BigNumberish,
    creatorFee: BigNumberish
  ): Promise<TrustedMarketFactory> {
    const owner = await this.signer.getAddress();
    const decimals = await Cash__factory.connect(collateral, this.signer).decimals();
    const shareFactor = calcShareFactor(decimals);
    return this.deploy("priceMarketFactory", () =>
      new TrustedMarketFactory__factory(this.signer).deploy(
        owner,
        collateral,
        shareFactor,
        feePot,
        stakerFee,
        creatorFee
      )
    );
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

  async deployAMMFactory(balancerFactory: string): Promise<AMMFactory> {
    return this.deploy("ammFactory", () => new AMMFactory__factory(this.signer).deploy(balancerFactory));
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
  addresses: { [name: string]: string };

  [name: string]: any; // eslint-disable-line  @typescript-eslint/no-explicit-any
}

export async function createMarket(
  signer: Signer,
  marketFactoryAddress: string,
  duration: BigNumberish,
  description: string,
  outcomes: string[],
  confirmations: number
): Promise<BigNumberish> {
  const marketFactory = TrustedMarketFactory__factory.connect(marketFactoryAddress, signer);
  const creator = await signer.getAddress();

  const now = BigNumber.from(Date.now()).div(1000);
  const endTime = now.add(duration);

  const marketId = await marketFactory.callStatic.createMarket(creator, endTime, description, outcomes, outcomes);
  await marketFactory
    .createMarket(creator, endTime, description, outcomes, outcomes)
    .then((tx) => tx.wait(confirmations));
  return marketId;
}

export async function createPool(
  signer: Signer,
  ammFactoryAddress: string,
  marketFactoryAddress: string,
  marketId: BigNumberish,
  initialLiquidity: BigNumberish,
  weights: BigNumberish[],
  confirmations: number
): Promise<BPool> {
  const ammFactory = AMMFactory__factory.connect(ammFactoryAddress, signer);
  const marketFactory = AbstractMarketFactory__factory.connect(marketFactoryAddress, signer);
  const lpTokenRecipient = await signer.getAddress();

  await ammFactory
    .createPool(marketFactory.address, marketId, initialLiquidity, weights, lpTokenRecipient, {})
    .then((tx) => tx.wait(confirmations));

  const pool = await ammFactory.callStatic.pools(marketFactoryAddress, marketId);
  return BPool__factory.connect(pool, signer);
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
