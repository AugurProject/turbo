import { ethers } from "hardhat";
import { expect } from "chai";
import { smockit } from '@eth-optimism/smock'

import {
  SymbioteHatchery__factory,
  SymbioteShareTokenFactory__factory,
} from "../typechain";

import { abi as abi_IParaUniverse } from "../artifacts/contracts/augur-para/IParaUniverse.sol/IParaUniverse.json";
import { abi as abi_IParaOICash } from "../artifacts/contracts/augur-para/IParaOICash.sol/IParaOICash.json";
import { abi as abi_IFeePot } from "../artifacts/contracts/augur-para/IFeePot.sol/IFeePot.json";
import { abi as abi_ICash } from "../artifacts/contracts/augur-core/ICash.sol/ICash.json";
import { abi as abi_IParaAugur } from "../artifacts/contracts/augur-para/IParaAugur.sol/IParaAugur.json";

describe("Symbiote", () => {
  it("is deployable", async () => {
    const [ signer ] = await ethers.getSigners();

    const mockParaUniverseAddress = "0x1000000000000000000000000000000000000000"
    const mockParaUniverse = await smockit(new ethers.utils.Interface(abi_IParaUniverse), { address: mockParaUniverseAddress });
    const mockOICashAddress = "0x1000000000000000000000000000000000000001"
    const mockOICash = await smockit(new ethers.utils.Interface(abi_IParaOICash), { address: mockOICashAddress });
    const mockFeePotAddress = "0x1000000000000000000000000000000000000002"
    const mockFeePot = await smockit(new ethers.utils.Interface(abi_IFeePot), { address: mockFeePotAddress });
    const mockCashAddress = "0x1000000000000000000000000000000000000003"
    const mockCash = await smockit(new ethers.utils.Interface(abi_ICash), { address: mockCashAddress });
    const mockParaAugurAddress = "0x1000000000000000000000000000000000000004"
    const mockParaAugur = await smockit(new ethers.utils.Interface(abi_IParaAugur), { address: mockParaAugurAddress });

    mockParaUniverse.smocked.openInterestCash.will.return.with(mockOICashAddress);
    mockParaUniverse.smocked.getFeePot.will.return.with(mockFeePotAddress);
    mockParaUniverse.smocked.cash.will.return.with(mockCashAddress);
    mockParaUniverse.smocked.augur.will.return.with(mockParaAugurAddress);

    mockCash.smocked.approve.will.return.with(true);

    const symbioteHatcherFactory = new SymbioteHatchery__factory(signer);
    const symbioteHatchery = await symbioteHatcherFactory.deploy();

    const symbioteShareTokenFactoryFactory = new SymbioteShareTokenFactory__factory(signer);
    const symbioteShareTokenFactory = await symbioteShareTokenFactoryFactory.deploy();

    await symbioteShareTokenFactory.initialize(symbioteHatchery.address);
    await symbioteHatchery.initialize(mockParaUniverseAddress, symbioteShareTokenFactory.address);

    expect(await symbioteHatchery.paraUniverse()).to.equal(mockParaUniverseAddress);
    expect(await symbioteHatchery.OICash()).to.equal(mockOICashAddress);
    expect(await symbioteHatchery.feePot()).to.equal(mockFeePotAddress);
    expect(await symbioteHatchery.underlyingCurrency()).to.equal(mockCashAddress);
  });
});
