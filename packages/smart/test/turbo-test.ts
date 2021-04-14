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
  TrustedMarketFactory,
  TrustedMarketFactory__factory,
  OwnedERC20,
  OwnedERC20__factory,
} from "../typechain";
import { BigNumber } from "ethers";
import { calcShareFactor, DEAD_ADDRESS } from "../src";

describe("Turbo", () => {
  let signer: SignerWithAddress;

  before(async () => {
    [signer] = await ethers.getSigners();
  });

  const outcomeSymbols = ["NO CONTEST", "ALL", "MANY", "FEW", "NONE"];
  const outcomeNames = ["No Contest", "All", "Many", "Few", "None"];
  const basis = BigNumber.from(10).pow(18);
  const usdcBasis = BigNumber.from(10).pow(6);

  let collateral: Cash;
  let shareFactor: BigNumber;
  let marketFactory: TrustedMarketFactory;
  let marketId: BigNumber;
  let noContest: OwnedERC20;
  let all: OwnedERC20;
  let many: OwnedERC20;
  let few: OwnedERC20;
  let none: OwnedERC20;
  let bFactory: BFactory;
  let ammFactory: AMMFactory;
  let pool: BPool;

  it("is deployable", async () => {
    collateral = await new Cash__factory(signer).deploy("USDC", "USDC", 6); // 6 decimals to mimic USDC
    const reputationToken = await new Cash__factory(signer).deploy("REPv2", "REPv2", 18);
    const feePot = await new FeePot__factory(signer).deploy(collateral.address, reputationToken.address);
    const smallFee = BigNumber.from(10).pow(16);
    shareFactor = calcShareFactor(await collateral.decimals());
    marketFactory = await new TrustedMarketFactory__factory(signer).deploy(
      signer.address,
      collateral.address,
      shareFactor,
      feePot.address,
      smallFee,
      smallFee
    );

    expect(await marketFactory.getOwner()).to.equal(signer.address);
    expect(await marketFactory.feePot()).to.equal(feePot.address);
    expect(await marketFactory.collateral()).to.equal(collateral.address);
  });

  it("can create a market", async () => {
    const endTime = BigNumber.from(Date.now())
      .div(1000)
      .add(60 * 60 * 24); // one day
    const description = "test market";
    await marketFactory.createMarket(signer.address, endTime, description, outcomeNames, outcomeSymbols);

    const filter = marketFactory.filters.MarketCreated(null, null, null, null, null);
    const logs = await marketFactory.queryFilter(filter);
    expect(logs.length).to.equal(1);
    const [log] = logs;
    [marketId] = log.args;
    expect(marketId).to.equal(0);

    const market = await marketFactory.getMarket(marketId);
    [noContest, all, many, few, none] = market.shareTokens.map((addr) => OwnedERC20__factory.connect(addr, signer));
    expect(await noContest.symbol()).to.equal("NO CONTEST");
    expect(await noContest.name()).to.equal("No Contest");
    expect(await all.symbol()).to.equal("ALL");
    expect(await all.name()).to.equal("All");
    expect(await many.symbol()).to.equal("MANY");
    expect(await many.name()).to.equal("Many");
    expect(await few.symbol()).to.equal("FEW");
    expect(await few.name()).to.equal("Few");
    expect(await none.symbol()).to.equal("NONE");
    expect(await none.name()).to.equal("None");
  });

  it("can mint sets", async () => {
    const setsToMint = shareFactor.mul(100);
    const costToMint = setsToMint.div(shareFactor);

    await collateral.faucet(costToMint);
    await collateral.approve(marketFactory.address, costToMint);
    await marketFactory.mintShares(marketId, setsToMint, signer.address);

    expect(await collateral.balanceOf(signer.address)).to.equal(0);
    expect(await noContest.balanceOf(signer.address)).to.equal(setsToMint);
    expect(await all.balanceOf(signer.address)).to.equal(setsToMint);
    expect(await many.balanceOf(signer.address)).to.equal(setsToMint);
    expect(await few.balanceOf(signer.address)).to.equal(setsToMint);
    expect(await none.balanceOf(signer.address)).to.equal(setsToMint);
  });

  it("can burn sets", async () => {
    const setsToBurn = shareFactor.mul(9);
    const setsLeft = shareFactor.mul(91);

    await marketFactory.burnShares(marketId, setsToBurn, signer.address);

    expect(await collateral.balanceOf(signer.address)).to.equal(9);
    expect(await noContest.balanceOf(signer.address)).to.equal(setsLeft);
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
    const initialLiquidity = usdcBasis.mul(1000); // 1000 of the collateral
    await collateral.faucet(initialLiquidity);
    await collateral.approve(ammFactory.address, initialLiquidity);
    await ammFactory.createPool(marketFactory.address, marketId, initialLiquidity, weights, signer.address);
    pool = BPool__factory.connect(await ammFactory.pools(marketFactory.address, marketId), signer);
    // Don't know why user gets this many LP tokens but it shouldn't matter.
    expect(await pool.balanceOf(signer.address)).to.equal(initialLiquidity.mul(shareFactor).div(10));
  });

  it("can add more liquidity to the AMM", async () => {
    const additionalLiquidity = usdcBasis.mul(10); // 10 USDC. Not very much
    await collateral.faucet(additionalLiquidity);
    await collateral.approve(ammFactory.address, additionalLiquidity);

    const pool = BPool__factory.connect(await ammFactory.pools(marketFactory.address, marketId), signer);
    await ammFactory.addLiquidity(marketFactory.address, marketId, additionalLiquidity, 0, signer.address);
    expect(await pool.balanceOf(signer.address)).to.equal(BigNumber.from("0x0579a8143038ecaf6c")); // hardcoded from observation
  });

  it("can buy shares from the AMM", async () => {
    const outcome = 1; // outcome "All"
    const collateralIn = usdcBasis; // 1 USDC

    await collateral.faucet(collateralIn);
    await collateral.approve(ammFactory.address, collateralIn);
    expect(await all.balanceOf(signer.address)).to.equal(shareFactor.mul(91)); // minted 100 sets, burned 9
    await ammFactory.buy(marketFactory.address, marketId, outcome, collateralIn, 0);
    expect(await all.balanceOf(signer.address)).to.equal("4160233730836129960"); // hardcoded from observation
  });

  it("can see the outcome ratios in the AMM", async () => {
    const ratios = await ammFactory.tokenRatios(marketFactory.address, marketId);
    
    const expectedRatios = [
      BigNumber.from(10).pow(18).toString(), // first is always 10^18
      "0xa738c278386e76fb",
      "0xad78f7240f30042d",
      "0xad78f7240f30042d",
      "0xa6889b55d123db0c",
    ].map(BigNumber.from);
    ratios.forEach((price, index) => {
      expect(price.toHexString()).to.equal(expectedRatios[index].toHexString());
    });
  });

  it("can read market from factory", async () => {
    const market = await marketFactory.callStatic.getMarket(marketId);
    expect(market.shareTokens.length).to.equal(5);
  });

  it("can read market balances", async () => {
    const balances = await ammFactory.getPoolBalances(marketFactory.address, marketId);
    expect(balances.length).to.equal(5);
  });

  it("can claim winnings", async () => {
    await marketFactory.trustedResolveMarket(marketId, 1);
    // can burn non-winning shares
    const setsLeft = await noContest.balanceOf(signer.address);
    await noContest.transfer(DEAD_ADDRESS, setsLeft);
    await many.transfer(DEAD_ADDRESS, setsLeft);
    await few.transfer(DEAD_ADDRESS, setsLeft);
    await none.transfer(DEAD_ADDRESS, setsLeft);

    expect(await collateral.balanceOf(signer.address)).to.equal(9); // previously burnt sets

    await marketFactory.claimWinnings(marketId, signer.address);

    const expectedWinnings = BigNumber.from("4118640"); // hardcoded from observation
    expect(await collateral.balanceOf(signer.address)).to.equal(expectedWinnings);
    expect(await noContest.balanceOf(signer.address)).to.equal(0);
    expect(await all.balanceOf(signer.address)).to.equal(0);
    expect(await many.balanceOf(signer.address)).to.equal(0);
    expect(await few.balanceOf(signer.address)).to.equal(0);
    expect(await none.balanceOf(signer.address)).to.equal(0);
  });
});
