// This script must be run through "yarn hardhat run <script.ts>.

import * as hre from "hardhat"; // imported for IDEs; is injected into globals by hardhat

import {
  SymbioteHatchery__factory,
  SymbioteShareTokenFactory__factory,
  FeePot__factory,
  Cash__factory,
  TrustedArbiter__factory,
} from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumberish, Contract } from "ethers";

class Deployer {
  constructor(readonly signer: SignerWithAddress) {}

  // Deploys the test contracts (faucets etc)
  async deployTest() {
    const collateral = await this.deployCash("USDC", "USDC", 18);
    const reputationToken = await this.deployCash("REPv2", "REPv2", 18);

    const symbioteShareTokenFactory = await this.deploySymbioteShareTokenFactory();
    const feePot = await this.deployFeePot(collateral.address, reputationToken.address);
    const symbioteHatchery = await this.deploySymbioteHatchery(symbioteShareTokenFactory.address, feePot.address);

    console.log("Initializing symbioteShareTokenFactory");
    await symbioteShareTokenFactory.initialize(symbioteHatchery.address);

    const arbiter = await this.deployTrustedArbiter(this.signer.address, symbioteHatchery.address);

    return mapOverObject(
      {
        collateral,
        reputationToken,
        symbioteHatchery,
        symbioteShareTokenFactory,
        feePot,
        arbiter,
      },
      (name, contract) => [name, contract.address]
    );
  }

  async deployCash(name: string, symbol: string, decimals: BigNumberish) {
    return this.logDeploy(name, () => new Cash__factory(this.signer).deploy(name, symbol, decimals));
  }

  async deploySymbioteShareTokenFactory() {
    return this.logDeploy("symbioteShareTokenFactory", () =>
      new SymbioteShareTokenFactory__factory(this.signer).deploy()
    );
  }

  async deployFeePot(collateral: string, reputationToken: string) {
    return this.logDeploy("feePot", () => new FeePot__factory(this.signer).deploy(collateral, reputationToken));
  }

  async deploySymbioteHatchery(symbioteShareTokenFactory: string, feePot: string) {
    return this.logDeploy("symbioteHatchery", () =>
      new SymbioteHatchery__factory(this.signer).deploy(symbioteShareTokenFactory, feePot)
    );
  }

  async deployTrustedArbiter(owner: string, hatchery: string) {
    return this.logDeploy("trustedArbiter", () =>
      new TrustedArbiter__factory(this.signer).deploy(owner, hatchery)
    );
  }

  async logDeploy<T extends Contract>(name: string, deployFn: (this: Deployer) => Promise<T>) {
    console.log(`Deploying ${name}`);
    const contract = await deployFn.bind(this)();
    console.log(`Deployed ${name}: ${contract.address}`);
    return contract;
  }
}

async function main() {
  const [signer] = await hre.ethers.getSigners();
  const deployer = new Deployer(signer);
  const addresses = await deployer.deployTest();
  console.log(JSON.stringify(addresses, null, 2));
}

function mapOverObject<V1, V2>(o: { [k: string]: V1 }, fn: (k: string, v: V1) => [string, V2]): { [k: string]: V2 } {
  const o2: { [k: string]: V2 } = {};
  for (const key in o) {
    if (!o.hasOwnProperty(key)) continue;
    const value = o[key];
    const [k, v] = fn(key, value);
    o2[k] = v;
  }
  return o2;
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
