import {
  AMMFactory,
  AMMFactory__factory,
  BFactory,
  BFactory__factory,
  BPool,
  BPool__factory,
  Cash,
  Cash__factory,
  HatcheryRegistry,
  HatcheryRegistry__factory,
  TrustedArbiter,
  TrustedArbiter__factory,
  TurboHatchery,
  TurboHatchery__factory,
} from "../typechain";
import { BigNumberish, Contract, Signer, BigNumber, utils } from "ethers";
import { randomAddress } from "hardhat/internal/hardhat-network/provider/fork/random";
import { MarketTypes } from "./utils/constants";
import { mapOverObject, sleep } from "./utils/common-functions";

export class Deployer {
  constructor(readonly signer: Signer, public confirmations: number = 0) {}

  // Deploys the test contracts (faucets etc)
  async deployTest(): Promise<Deploy> {
    console.log("Deploying test contracts");
    const collateral = await this.deployCollateral("USDC", "USDC", 18);
    const reputationToken = await this.deployCollateral("REPv2", "REPv2", 18);
    const balancerFactory = await this.deployBalancerFactory();

    console.log("Deploying core Turbo system");
    const hatcheryRegistry = await this.deployHatcheryRegistry(await this.signer.getAddress(), reputationToken.address);
    const hatchery = await createHatchery(
      hatcheryRegistry.signer,
      hatcheryRegistry.address,
      collateral.address,
      this.confirmations
    );
    const arbiter = await this.deployTrustedArbiter(await this.signer.getAddress(), hatchery.address);

    await sleep(10000); // matic needs a little time

    console.log("Creating a turbo for testing");
    const turboId = await createTurbo(
      this.signer,
      hatchery.address,
      buildTrustedArbiterConfiguration({ arbiter: arbiter.address }),
      this.confirmations
    );
    console.log(`Created turbo: ${turboId}`);

    console.log("Creating AMM for testing");
    const basis = BigNumber.from(10).pow(18);
    const weights = [
      // each weight must be in the range [1e18,50e18]. max total weight is 50e18
      basis.mul(2).div(2), // Invalid at 2%
      basis.mul(49).div(2), // No at 49%
      basis.mul(49).div(2), // Yes at 49%
    ];
    const ammFactory = await this.deployAMMFactory(balancerFactory.address);
    const initialLiquidity = basis.mul(1000); // 1000 of the collateral
    console.log("Fauceting collateral for AMM");
    await collateral.faucet(initialLiquidity).then((tx) => tx.wait(this.confirmations));
    console.log("Approving the AMM to spend some of the deployer's collateral");
    await collateral.approve(ammFactory.address, initialLiquidity).then((tx) => tx.wait(this.confirmations));
    console.log("Creating pool");
    await sleep(10000); // matic needs a little time
    const pool = await createPool(
      this.signer,
      ammFactory.address,
      hatchery.address,
      turboId,
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
        hatcheryRegistry,
        hatchery,
        arbiter,
        ammFactory,
        pool,
      },
      (name, contract) => [name, contract.address]
    );
    return {
      addresses,
      turboId: turboId,
    };
  }

  async deployProduction(externalAddresses: ContractDeployExternalAddresses): Promise<Deploy> {
    const { reputationToken } = externalAddresses;

    console.log("Deploying core Turbo system");
    const hatcheryRegistry = await this.deployHatcheryRegistry(await this.signer.getAddress(), reputationToken);

    const addresses = mapOverObject(
      {
        hatcheryRegistry,
      },
      (name, contract) => [name, contract.address]
    );

    return { addresses };
  }

  async deployCollateral(name: string, symbol: string, decimals: BigNumberish): Promise<Cash> {
    return this.deploy(name, () => new Cash__factory(this.signer).deploy(name, symbol, decimals));
  }

  async deployHatcheryRegistry(owner: string, reputationToken: string): Promise<HatcheryRegistry> {
    return this.deploy("hatcheryRegistry", () =>
      new HatcheryRegistry__factory(this.signer).deploy(owner, reputationToken)
    );
  }

  async deployTrustedArbiter(owner: string, hatchery: string): Promise<TrustedArbiter> {
    return this.deploy("trustedArbiter", () => new TrustedArbiter__factory(this.signer).deploy(owner, hatchery));
  }

  async deployBalancerFactory(): Promise<BFactory> {
    return this.deploy("balancerFactory", () => new BFactory__factory(this.signer).deploy());
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

function buildTrustedArbiterConfiguration(
  specified: Partial<TrustedArbiterConfiguration> & { arbiter: string }
): TrustedArbiterConfiguration {
  const extraInfoObj = {
    description: "Initial Market Created",
    details: "market details",
    categories: ["test", "market", "category"],
  };

  return {
    creatorFee: BigNumber.from(10).pow(16),
    outcomeSymbols: ["NO CONTEST", "NO", "YES"],
    outcomeNames: ["No Contest", "No", "Yes"].map(utils.formatBytes32String),
    numTicks: 1000,
    startTime: BigNumber.from(Date.now()).div(1000).add(60),
    duration: 60 * 60 * 24,
    extraInfo: JSON.stringify(extraInfoObj),
    prices: [],
    marketType: MarketTypes.CATEGORICAL,
    ...specified,
  };
}

export async function createHatchery(
  signer: Signer,
  hatcheryRegistry: string,
  collateral: string,
  confirmations: number
): Promise<TurboHatchery> {
  console.log("Creating a hatchery for testing");
  const registry = HatcheryRegistry__factory.connect(hatcheryRegistry, signer);
  await registry.createHatchery(collateral).then((tx) => tx.wait(confirmations));

  const hatchery = await registry.callStatic.getHatchery(collateral);
  console.log(`Created hatchery: ${hatchery}`);
  return TurboHatchery__factory.connect(hatchery, signer);
}

async function createTurbo(
  signer: Signer,
  hatcheryAddress: string,
  arbiterConfiguration: TrustedArbiterConfiguration,
  confirmations: number
): Promise<BigNumberish> {
  const {
    creatorFee,
    outcomeSymbols,
    outcomeNames,
    numTicks,
    arbiter: arbiterAddress,
    startTime,
    duration,
    extraInfo,
    prices,
    marketType,
  } = arbiterConfiguration;

  const hatchery = TurboHatchery__factory.connect(hatcheryAddress, signer);
  const arbiter = TrustedArbiter__factory.connect(arbiterAddress, signer);

  const index = randomAddress(); // just a hexadecimal between 0 and 2**160
  const arbiterConfig = await arbiter.callStatic.encodeConfiguration(
    startTime,
    duration,
    extraInfo,
    prices,
    marketType
  );
  await hatchery
    .createTurbo(index, creatorFee, outcomeSymbols, outcomeNames, numTicks, arbiterAddress, arbiterConfig)
    .then((tx) => tx.wait(confirmations));
  const turboLength = await hatchery.callStatic.getTurboLength();
  return turboLength.sub(1);
}

export async function createPool(
  signer: Signer,
  ammFactoryAddress: string,
  hatcheryAddress: string,
  turboId: BigNumberish,
  initialLiquidity: BigNumberish,
  weights: BigNumberish[],
  confirmations: number
): Promise<BPool> {
  const ammFactory = AMMFactory__factory.connect(ammFactoryAddress, signer);
  const hatchery = TurboHatchery__factory.connect(hatcheryAddress, signer);
  const lpTokenRecipient = await signer.getAddress();

  await ammFactory
    .createPool(hatchery.address, turboId, initialLiquidity, weights, lpTokenRecipient, {})
    .then((tx) => tx.wait(confirmations));

  const pool = await ammFactory.callStatic.pools(hatcheryAddress, turboId);
  return BPool__factory.connect(pool, signer);
}

export interface TrustedArbiterConfiguration {
  creatorFee: BigNumberish;
  outcomeSymbols: string[];
  outcomeNames: string[];
  numTicks: BigNumberish;
  arbiter: string;

  // encoded in TrustedArbiter.TrustedConfiguration
  startTime: BigNumberish;
  duration: BigNumberish;
  extraInfo: string;
  prices: BigNumberish[];
  marketType: MarketTypes;
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
