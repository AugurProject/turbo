import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";

import {
  AMMFactory,
  AMMFactory__factory,
  BFactory,
  BFactory__factory,
  BPool,
  BPool__factory,
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
import { BigNumber, BytesLike } from "ethers";
import { DEAD_ADDRESS, MarketTypes } from "../src";

describe("Turbo", () => {
  let signer: SignerWithAddress;

  before(async () => {
    [signer] = await ethers.getSigners();
  });

  const creatorFee = 1;
  const outcomeSymbols = ["ALL", "MANY", "FEW", "NONE"];
  const outcomeNames = ["All", "Many", "Few", "None"].map(ethers.utils.formatBytes32String) as BytesLike[];
  const numTicks = 1000;
  const startTime: number = Date.now() + 60;
  const duration = 60 * 60;
  const extraInfo = "";
  const prices: number[] = [];
  const marketType = MarketTypes.CATEGORICAL;
  const basis = BigNumber.from(10).pow(18);

  let collateral: Cash;
  let turboHatchery: TurboHatchery;
  let turboId: BigNumber;
  let invalid: TurboShareToken;
  let all: TurboShareToken;
  let many: TurboShareToken;
  let few: TurboShareToken;
  let none: TurboShareToken;
  let arbiter: TrustedArbiter;
  let bFactory: BFactory;
  let ammFactory: AMMFactory;
  let pool: BPool;

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
  const collateralIn = basis.mul(2);

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

  it("can make an AMM", async () => {
    bFactory = await new BFactory__factory(signer).deploy();
    ammFactory = await new AMMFactory__factory(signer).deploy(bFactory.address);
    const weights = [
      // each weight must be in the range [1e18,50e18]. max total weight is 50e18
      basis.mul(2).div(2), // Invalid at 2%
      basis.mul(24).div(2), // All at 24%
      basis.mul(25).div(2), // Some at 25%
      basis.mul(25).div(2), // Few at 25%
      basis.mul(24).div(2), // None at 24%
    ];
    const initialLiquidity = basis.mul(1000); // 1000 of the collateral
    await collateral.faucet(initialLiquidity);
    await collateral.approve(ammFactory.address, initialLiquidity);
    await ammFactory.createPool(turboHatchery.address, turboId, initialLiquidity, weights, signer.address);
    pool = BPool__factory.connect(await ammFactory.pools(turboHatchery.address, turboId), signer);
    expect(await pool.balanceOf(signer.address)).to.equal(initialLiquidity.div(10));
  });

  it("can add more liquidity to the AMM", async () => {
    const additionalLiquidity = basis;
    await collateral.faucet(additionalLiquidity);
    await collateral.approve(ammFactory.address, additionalLiquidity);

    const pool = BPool__factory.connect(await ammFactory.pools(turboHatchery.address, turboId), signer);
    await ammFactory.addLiquidity(turboHatchery.address, turboId, additionalLiquidity, 0, signer.address);
    expect(await pool.balanceOf(signer.address)).to.equal(BigNumber.from("100099999924075385080")); // hardcoded from observation
  });

  it("can buy shares from the AMM", async () => {
    const outcome = 1; // outcome "All"
    await collateral.faucet(collateralIn);
    await collateral.approve(ammFactory.address, collateralIn);
    expect(await all.balanceOf(signer.address)).to.equal(91); // minted 100 sets, burned 9
    await ammFactory.buy(turboHatchery.address, turboId, outcome, collateralIn, 0);
    expect(await all.balanceOf(signer.address)).to.equal(8307054961011936); // hardcoded from observation
  });

  it("can see the outcome prices in the AMM", async () => {
    const prices = await ammFactory.prices(turboHatchery.address, turboId);

    const expectedPrices = [
      "0x48811dc9f25e0a",
      "0x036d51c056e026ca",
      "0x038a4e2fc19db6f1",
      "0x038a4e2fc19db6f1",
      "0x03660d9e7c6e7230",
    ];
    prices.forEach((price, index) => {
      expect(price.toHexString()).to.equal(expectedPrices[index]);
    });
  });

  it("can read turbo from arbiter", async () => {
    const stuff = await arbiter.callStatic.getTurbo(turboId);
    expect(stuff.outcomeNames.length).to.equal(4);
  });

  it("can claim winnings", async () => {
    await arbiter.setTurboResolution(turboId, [0, numTicks, 0, 0, 0]);
    // can burn non-winning shares
    await invalid.transfer(DEAD_ADDRESS, setsLeft);
    await many.transfer(DEAD_ADDRESS, setsLeft);
    await few.transfer(DEAD_ADDRESS, setsLeft);
    await none.transfer(DEAD_ADDRESS, setsLeft);

    expect(await collateral.balanceOf(signer.address)).to.equal(setsToBurn * 1000);
    await turboHatchery.claimWinnings(turboId);

    const expectedWinnings = BigNumber.from(setsToBurn).mul(1000).add(BigNumber.from("8307054961011936").mul(1000));
    expect(await collateral.balanceOf(signer.address)).to.equal(expectedWinnings);
    expect(await invalid.balanceOf(signer.address)).to.equal(0);
    expect(await all.balanceOf(signer.address)).to.equal(0);
    expect(await many.balanceOf(signer.address)).to.equal(0);
    expect(await few.balanceOf(signer.address)).to.equal(0);
    expect(await none.balanceOf(signer.address)).to.equal(0);
  });
});
