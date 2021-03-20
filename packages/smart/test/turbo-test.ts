import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";

import {
  Cash,
  Cash__factory,
  FeePot__factory,
  TrustedArbiter,
  TrustedArbiter__factory,
  TurboHatchery,
  TurboHatchery__factory,
  TurboShareToken,
  TurboShareToken__factory,
  TurboShareTokenFactory__factory,
} from "../typechain";
import { BigNumber } from "ethers";
import { DEAD_ADDRESS, MarketTypes } from "../src/util";

describe("Turbo", () => {
  let signer: SignerWithAddress;

  before(async () => {
    [signer] = await ethers.getSigners();
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
  let turboHatchery: TurboHatchery;
  let turboId: BigNumber;
  let invalid: TurboShareToken;
  let all: TurboShareToken;
  let many: TurboShareToken;
  let few: TurboShareToken;
  let none: TurboShareToken;
  let arbiter: TrustedArbiter;

  it("is deployable", async () => {
    collateral = await new Cash__factory(signer).deploy("USDC", "USDC", 18);
    const reputationToken = await new Cash__factory(signer).deploy("REPv2", "REPv2", 18);
    const turboShareTokenFactory = await new TurboShareTokenFactory__factory(signer).deploy();
    const feePot = await new FeePot__factory(signer).deploy(collateral.address, reputationToken.address);
    turboHatchery = await new TurboHatchery__factory(signer).deploy(turboShareTokenFactory.address, feePot.address);

    await turboShareTokenFactory.initialize(turboHatchery.address);

    expect(await turboHatchery.tokenFactory()).to.equal(turboShareTokenFactory.address);
    expect(await turboHatchery.feePot()).to.equal(feePot.address);
    expect(await turboHatchery.collateral()).to.equal(collateral.address);
  });

  it("can create a market", async () => {
    arbiter = await new TrustedArbiter__factory(signer).deploy(signer.address, turboHatchery.address);
    const arbiterConfiguration = await arbiter.encodeConfiguration(startTime, duration, extraInfo, prices, marketType);
    const index = 42; // arbitrary uint256 for easy log filtering
    await turboHatchery.createTurbo(
      index,
      creatorFee,
      outcomeSymbols,
      outcomeNames,
      numTicks,
      arbiter.address,
      arbiterConfiguration
    );
    const filter = turboHatchery.filters.TurboCreated(null, null, null, null, null, null, null, index);
    const logs = await turboHatchery.queryFilter(filter);
    expect(logs.length).to.equal(1);
    const [log] = logs;
    [turboId] = log.args;
    expect(turboId).to.equal(0);

    const shareTokens = await turboHatchery.getShareTokens(turboId);
    [invalid, all, many, few, none] = await Promise.all(
      shareTokens.map((addr) => new TurboShareToken__factory(signer).attach(addr))
    );
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
    await collateral.approve(turboHatchery.address, costToMint);
    await turboHatchery.mintCompleteSets(turboId, setsToMint, signer.address);

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
    await turboHatchery.burnCompleteSets(turboId, setsToBurn, signer.address);

    expect(await collateral.balanceOf(signer.address)).to.equal(9 * numTicks);
    expect(await invalid.balanceOf(signer.address)).to.equal(setsLeft);
    expect(await all.balanceOf(signer.address)).to.equal(setsLeft);
    expect(await many.balanceOf(signer.address)).to.equal(setsLeft);
    expect(await few.balanceOf(signer.address)).to.equal(setsLeft);
    expect(await none.balanceOf(signer.address)).to.equal(setsLeft);
  });

  it("can claim winnings", async () => {
    await arbiter.setTurboResolution(turboId, [0, numTicks, 0, 0, 0]);
    // can burn non-winning shares
    await invalid.transfer(DEAD_ADDRESS, setsLeft);
    await many.transfer(DEAD_ADDRESS, setsLeft);
    await few.transfer(DEAD_ADDRESS, setsLeft);
    await none.transfer(DEAD_ADDRESS, setsLeft);

    await turboHatchery.claimWinnings(turboId);

    expect(await collateral.balanceOf(signer.address)).to.equal(costToMint); // got all your money back
    expect(await invalid.balanceOf(signer.address)).to.equal(0);
    expect(await all.balanceOf(signer.address)).to.equal(0);
    expect(await many.balanceOf(signer.address)).to.equal(0);
    expect(await few.balanceOf(signer.address)).to.equal(0);
    expect(await none.balanceOf(signer.address)).to.equal(0);
  });
});
