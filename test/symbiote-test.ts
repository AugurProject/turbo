import { ethers } from "hardhat";
import { expect } from "chai";

import {
  SymbioteHatchery__factory,
  SymbioteShareTokenFactory__factory,
  FeePot__factory,
  Cash__factory,
} from "../typechain";

const NULL_ADDRESS = "0x1000000000000000000000000000000000000004";

describe("Symbiote", () => {
  it("is deployable", async () => {
    const [ signer ] = await ethers.getSigners();

    const symbioteHatcherFactory = new SymbioteHatchery__factory(signer);
    const symbioteShareTokenFactoryFactory = new SymbioteShareTokenFactory__factory(signer);
    const feePotFactory = new FeePot__factory(signer);
    const cashFactory = new Cash__factory(signer);

    const collateral = await cashFactory.deploy("USDC", "USDC", 18);
    const reputationToken = await cashFactory.deploy("REPv2", "REPv2", 18);
    const symbioteHatchery = await symbioteHatcherFactory.deploy();
    const symbioteShareTokenFactory = await symbioteShareTokenFactoryFactory.deploy();
    const feePot = await feePotFactory.deploy(collateral.address, reputationToken.address);

    await symbioteShareTokenFactory.initialize(symbioteHatchery.address);
    await symbioteHatchery.initialize(NULL_ADDRESS, symbioteShareTokenFactory.address, feePot.address);

    expect(await symbioteHatchery.oracle()).to.equal(NULL_ADDRESS);
    expect(await symbioteHatchery.tokenFactory()).to.equal(symbioteShareTokenFactory.address);
    expect(await symbioteHatchery.feePot()).to.equal(feePot.address);
    expect(await symbioteHatchery.collateral()).to.equal(collateral.address);
  });
});
