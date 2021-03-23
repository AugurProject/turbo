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
import { mapOverObject, MarketTypes } from "./util";
import { randomAddress } from "hardhat/internal/hardhat-network/provider/fork/random";
import { ContractDeployExternalAddresses } from "hardhat/types";

export class Deployer {
  constructor(readonly signer: Signer) {}

  // Deploys the test contracts (faucets etc)
  async deployTest(): Promise<Deploy> {
    console.log("Deploying test contracts");
    const collateral = await this.deployCollateral("USDC", "USDC", 18);
    const reputationToken = await this.deployCollateral("REPv2", "REPv2", 18);
    const balancerFactory = await this.deployBalancerFactory();

    console.log("Deploying core Turbo system");
    const hatcheryRegistry = await this.deployHatcheryRegistry(await this.signer.getAddress(), reputationToken.address);

    console.log("Creating a hatchery for testing");
    const creator = new TurboCreator(hatcheryRegistry);
    const hatchery = await creator.createHatchery(collateral.address);
    const arbiter = await this.deployTrustedArbiter(await this.signer.getAddress(), hatchery.address);

    console.log("Creating a turbo for testing");
    const turboId = await creator.createTurbo(
      hatchery.address,
      TurboCreator.buildTrustedArbiterConfiguration({ arbiter: arbiter.address })
    );

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
    await collateral.faucet(initialLiquidity);
    console.log("Approving the AMM to spend some of the deployer's collateral");
    await collateral.approve(ammFactory.address, initialLiquidity);
    console.log("Creating pool");
    const pool = await creator.createPool(ammFactory.address, hatchery.address, turboId, initialLiquidity, weights);

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
    return this.logDeploy(name, () => new Cash__factory(this.signer).deploy(name, symbol, decimals));
  }

  async deployHatcheryRegistry(owner: string, reputationToken: string): Promise<HatcheryRegistry> {
    return this.logDeploy("hatcheryRegistry", () =>
      new HatcheryRegistry__factory(this.signer).deploy(owner, reputationToken)
    );
  }

  async deployTrustedArbiter(owner: string, hatchery: string): Promise<TrustedArbiter> {
    return this.logDeploy("trustedArbiter", () => new TrustedArbiter__factory(this.signer).deploy(owner, hatchery));
  }

  async deployBalancerFactory(): Promise<BFactory> {
    return this.logDeploy("balancerFactory", () => new BFactory__factory(this.signer).deploy());
  }

  async deployAMMFactory(balancerFactory: string): Promise<AMMFactory> {
    return this.logDeploy("ammFactory", () => new AMMFactory__factory(this.signer).deploy(balancerFactory));
  }

  async logDeploy<T extends Contract>(name: string, deployFn: (this: Deployer) => Promise<T>): Promise<T> {
    console.log(`Deploying ${name}`);
    const contract = await deployFn.bind(this)().catch(err => { console.error(err); throw err});
    console.log(`Deployed ${name}: ${contract.address}`);
    return contract;
  }
}

export interface Deploy {
  addresses: { [name: string]: string };
  [name: string]: any; // eslint-disable-line  @typescript-eslint/no-explicit-any
}

export class TurboCreator {
  constructor(readonly hatcheryRegistry: HatcheryRegistry) {}

  async createHatchery(collateral: string): Promise<TurboHatchery> {
    await this.hatcheryRegistry.createHatchery(collateral).then(tx => tx.wait());

    const filter = this.hatcheryRegistry.filters.NewHatchery(null, collateral);
    const [log] = await this.hatcheryRegistry.queryFilter(filter);
    const [hatchery] = log.args;
    return TurboHatchery__factory.connect(hatchery, this.hatcheryRegistry.signer);
  }

  async createTurbo(hatcheryAddress: string, arbiterConfiguration: TrustedArbiterConfiguration): Promise<BigNumberish> {
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

    const hatchery = TurboHatchery__factory.connect(hatcheryAddress, this.hatcheryRegistry.signer);
    const arbiter = TrustedArbiter__factory.connect(arbiterAddress, this.hatcheryRegistry.signer);

    const index = randomAddress(); // just a hexadecimal between 0 and 2**160
    const arbiterConfig = await arbiter.encodeConfiguration(startTime, duration, extraInfo, prices, marketType);
    await hatchery.createTurbo(
      index,
      creatorFee,
      outcomeSymbols,
      outcomeNames,
      numTicks,
      arbiterAddress,
      arbiterConfig
    ).then(tx => tx.wait());
    const filter = hatchery.filters.TurboCreated(null, null, null, null, null, null, null, index);
    const [log] = await hatchery.queryFilter(filter);
    const [id] = log.args;
    return id;
  }

  static buildTrustedArbiterConfiguration(
    specified: Partial<TrustedArbiterConfiguration> & { arbiter: string }
  ): TrustedArbiterConfiguration {
    return {
      creatorFee: BigNumber.from(10).pow(16),
      outcomeSymbols: ["NO", "YES"],
      outcomeNames: ["NO", "YES"].map(utils.formatBytes32String),
      numTicks: 1000,
      startTime: Date.now() + 60,
      duration: 60 * 60 * 24,
      extraInfo: "",
      prices: [],
      marketType: MarketTypes.CATEGORICAL,
      ...specified,
    };
  }

  async createPool(
    ammFactoryAddress: string,
    hatcheryAddress: string,
    turboId: BigNumberish,
    initialLiquidity: BigNumberish,
    weights: BigNumberish[]
  ): Promise<BPool> {
    const ammFactory = AMMFactory__factory.connect(ammFactoryAddress, this.hatcheryRegistry.signer);
    const hatchery = TurboHatchery__factory.connect(hatcheryAddress, this.hatcheryRegistry.signer);

    await ammFactory.createPool(
      hatchery.address,
      turboId,
      initialLiquidity,
      weights,
      await this.hatcheryRegistry.signer.getAddress()
    ).then(tx => tx.wait());
    const filter = ammFactory.filters.PoolCreated(
      null,
      hatcheryAddress,
      turboId,
      await this.hatcheryRegistry.signer.getAddress()
    );
    const [log] = await ammFactory.queryFilter(filter);
    const [pool] = log.args;
    return BPool__factory.connect(pool, this.hatcheryRegistry.signer);
  }
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
