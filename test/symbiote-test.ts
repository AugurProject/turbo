import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";

import {
  SymbioteHatchery__factory, SymbioteHatchery,
  SymbioteShareTokenFactory__factory,
  FeePot__factory,
  Cash__factory,
  TrustedArbiter__factory,
  SymbioteShareToken__factory, SymbioteShareToken, Cash, TrustedArbiter,
} from "../typechain";
import { BigNumber } from "ethers";

const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";
const DEAD_ADDRESS = "0x000000000000000000000000000000000000DEAD";
enum MarketTypes {
  YES_NO,
  CATEGORICAL,
  SCALAR
}

describe("Symbiote", () => {
  let signer: SignerWithAddress;
  let symbioteHatcherFactory: SymbioteHatchery__factory;
  let symbioteShareTokenFactoryFactory: SymbioteShareTokenFactory__factory;
  let feePotFactory: FeePot__factory;
  let cashFactory: Cash__factory;
  let trustedArbiterFactory: TrustedArbiter__factory;
  let factorySymbioteShareToken: SymbioteShareToken__factory;

  before(async () => {
    [ signer ] = await ethers.getSigners();
    symbioteHatcherFactory = new SymbioteHatchery__factory(signer);
    symbioteShareTokenFactoryFactory = new SymbioteShareTokenFactory__factory(signer);
    feePotFactory = new FeePot__factory(signer);
    cashFactory = new Cash__factory(signer);
    trustedArbiterFactory = new TrustedArbiter__factory(signer);
    factorySymbioteShareToken = new SymbioteShareToken__factory(signer);

  });

  const creatorFee = 1;
  const outcomeSymbols = ["ALL", "MANY", "FEW", "NONE"];
  const outcomeNames = ["All", "Many", "Few", "None"].map(ethers.utils.formatBytes32String);
  const numTicks = 1000;
  const startTime: number = Date.now() + 60;
  const duration = 60 * 60;
  const extraInfo = "";
  const prices: number[] = [];
  const marketType = MarketTypes.CATEGORICAL;

  let collateral: Cash;
  let symbioteHatchery: SymbioteHatchery;
  let symbioteId: BigNumber;
  let invalid: SymbioteShareToken;
  let all: SymbioteShareToken;
  let many: SymbioteShareToken;
  let few: SymbioteShareToken;
  let none: SymbioteShareToken;
  let arbiter: TrustedArbiter;

  it("is deployable", async () => {
    collateral = await cashFactory.deploy("USDC", "USDC", 18);
    const reputationToken = await cashFactory.deploy("REPv2", "REPv2", 18);
    symbioteHatchery = await symbioteHatcherFactory.deploy();
    const symbioteShareTokenFactory = await symbioteShareTokenFactoryFactory.deploy();
    const feePot = await feePotFactory.deploy(collateral.address, reputationToken.address);

    await symbioteShareTokenFactory.initialize(symbioteHatchery.address);
    await symbioteHatchery.initialize(symbioteShareTokenFactory.address, feePot.address);

    expect(await symbioteHatchery.tokenFactory()).to.equal(symbioteShareTokenFactory.address);
    expect(await symbioteHatchery.feePot()).to.equal(feePot.address);
    expect(await symbioteHatchery.collateral()).to.equal(collateral.address);
  });

  it("can create a market", async () => {
    arbiter = await trustedArbiterFactory.deploy(signer.address, symbioteHatchery.address);
    const arbiterConfiguration = await arbiter.encodeConfiguration(startTime, duration, extraInfo, prices, marketType);
    await symbioteHatchery.createSymbiote(creatorFee, outcomeSymbols, outcomeNames, numTicks, arbiter.address, arbiterConfiguration);
    const filter = symbioteHatchery.filters.SymbioteCreated(null, null, null, null, null, null, null);
    const logs = await symbioteHatchery.queryFilter(filter);
    expect(logs.length).to.equal(1);
    const [ log ] = logs;
    [ symbioteId ] = log.args;
    expect(symbioteId).to.equal(0);

    const shareTokens = await symbioteHatchery.getShareTokens(symbioteId);
    [ invalid, all, many, few, none ] = await Promise.all(shareTokens.map(addr => factorySymbioteShareToken.attach(addr)));
    expect(await invalid.symbol()).to.equal("INVALID");
    expect(await invalid.name()).to.equal(ethers.utils.formatBytes32String("INVALID SHARE"));
    expect(await all.symbol()).to.equal("ALL");
    expect(await all.name()).to.equal(ethers.utils.formatBytes32String("All"));
    expect(await many.symbol()).to.equal("MANY");
    expect(await many.name()).to.equal(ethers.utils.formatBytes32String("Many"));
    expect(await few.symbol()).to.equal("FEW");
    expect(await few.name()).to.equal(ethers.utils.formatBytes32String("Few"));
    expect(await none.symbol()).to.equal("NONE");
    expect(await none.name()).to.equal(ethers.utils.formatBytes32String("None"));
  });

  const setsToMint = 100;
  const costToMint = setsToMint * numTicks;

  it("can mint sets", async () => {
    await collateral.faucet(costToMint);
    await collateral.approve(symbioteHatchery.address, costToMint);
    await symbioteHatchery.mintCompleteSets(symbioteId, setsToMint, signer.address);

    expect(await collateral.balanceOf(signer.address)).to.equal(0);
    expect(await invalid.balanceOf(signer.address)).to.equal(setsToMint);
    expect(await all.balanceOf(signer.address)).to.equal(setsToMint);
    expect(await many.balanceOf(signer.address)).to.equal(setsToMint);
    expect(await few.balanceOf(signer.address)).to.equal(setsToMint);
    expect(await none.balanceOf(signer.address)).to.equal(setsToMint);
  });

  const setsToBurn = 9;
  const setsLeft = setsToMint - setsToBurn;

  it("can burn sets", async () => {
    await symbioteHatchery.burnCompleteSets(symbioteId, setsToBurn, signer.address);

    expect(await collateral.balanceOf(signer.address)).to.equal(9 * numTicks);
    expect(await invalid.balanceOf(signer.address)).to.equal(setsLeft);
    expect(await all.balanceOf(signer.address)).to.equal(setsLeft);
    expect(await many.balanceOf(signer.address)).to.equal(setsLeft);
    expect(await few.balanceOf(signer.address)).to.equal(setsLeft);
    expect(await none.balanceOf(signer.address)).to.equal(setsLeft);
  });

  it("can claim winnings", async () => {
    await arbiter.setSymbioteResolution(symbioteId, [0, numTicks, 0, 0, 0]);
    // can burn non-winning shares
    await invalid.transfer(DEAD_ADDRESS, setsLeft);
    await many.transfer(DEAD_ADDRESS, setsLeft);
    await few.transfer(DEAD_ADDRESS, setsLeft);
    await none.transfer(DEAD_ADDRESS, setsLeft);

    await symbioteHatchery.claimWinnings(symbioteId);

    expect(await collateral.balanceOf(signer.address)).to.equal(costToMint); // got all your money back
    expect(await invalid.balanceOf(signer.address)).to.equal(0);
    expect(await all.balanceOf(signer.address)).to.equal(0);
    expect(await many.balanceOf(signer.address)).to.equal(0);
    expect(await few.balanceOf(signer.address)).to.equal(0);
    expect(await none.balanceOf(signer.address)).to.equal(0);
  });
});
