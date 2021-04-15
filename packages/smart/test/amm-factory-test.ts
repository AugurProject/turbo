import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { expect } from "chai";

import { AbstractMarketFactory, AMMFactory } from "../typechain";
import { BigNumber, Contract, ContractFactory } from "ethers";
import { calcShareFactor } from "../src";
import { buyWithValues, calculateSellCompleteSets, calculateSellCompleteSetsWithValues } from "../src/bmath";

describe("AMMFactory", () => {
  let AMMFactory__factory: ContractFactory;
  let BFactory__factory: ContractFactory;
  let BPool__factory: ContractFactory;
  let Cash__factory: ContractFactory;
  let FeePot__factory: ContractFactory;
  let TrustedMarketFactory__factory: ContractFactory;

  let signer: SignerWithAddress;
  let secondSigner: SignerWithAddress;
  const outcomeSymbols = ["NO CONTEST", "HH", "UT"];
  const outcomeNames = ["No Contest", "Hulk Hogan", "Undertaker"];

  const usdcBasis = BigNumber.from(10).pow(6);
  const stakerFee = 0;
  const swapFee = BigNumber.from(10).pow(15).mul(15); // 1.5%
  const settlementFee = BigNumber.from(10).pow(15).mul(5); // 0.5%
  const protocolFee = 0;

  const MAX_APPROVAL = BigNumber.from(2).pow(256).sub(1);
  const ZERO = BigNumber.from(0);

  let collateral: Contract;
  let shareFactor: BigNumber;
  let marketFactory: Contract;
  const marketId = BigNumber.from(0);
  let bFactory: Contract;
  let ammFactory: Contract;

  // These are specific to the one market we are dealing with in the tests below.
  let shareTokens: Contract[];
  let bPool: Contract;

  before(async () => {
    AMMFactory__factory = await ethers.getContractFactory("AMMFactory");
    BFactory__factory = await ethers.getContractFactory("BFactory");
    BPool__factory = await ethers.getContractFactory("BPool");
    Cash__factory = await ethers.getContractFactory("Cash");
    FeePot__factory = await ethers.getContractFactory("FeePot");
    TrustedMarketFactory__factory = await ethers.getContractFactory("TrustedMarketFactory");
  });

  beforeEach(async () => {
    [signer, secondSigner] = await ethers.getSigners();

    collateral = await Cash__factory.deploy("USDC", "USDC", 6); // 6 decimals to mimic USDC
    const reputationToken = await Cash__factory.deploy("REPv2", "REPv2", 18);
    const feePot = await FeePot__factory.deploy(collateral.address, reputationToken.address);
    shareFactor = calcShareFactor(await collateral.decimals());
    marketFactory = await TrustedMarketFactory__factory.deploy(
      signer.address,
      collateral.address,
      shareFactor,
      feePot.address,
      stakerFee,
      settlementFee,
      signer.address,
      protocolFee
    );

    bFactory = await BFactory__factory.deploy();
    ammFactory = await AMMFactory__factory.deploy(bFactory.address, swapFee);

    const endTime = BigNumber.from(Date.now())
      .div(1000)
      .add(60 * 60 * 24); // one day
    const description = "Who will win Wrestlemania III?";
    await marketFactory.createMarket(signer.address, endTime, description, outcomeNames, outcomeSymbols);

    const basis = BigNumber.from(10).pow(18);
    const weights = [basis.mul(2), basis.mul(24), basis.mul(24)];

    const initialLiquidity = usdcBasis.mul(1000); // 1000 of the collateral
    await collateral.faucet(initialLiquidity);
    await collateral.approve(ammFactory.address, initialLiquidity);
    await ammFactory.createPool(marketFactory.address, marketId, initialLiquidity, weights, signer.address);

    const bPoolAddress = await ammFactory.getPool(marketFactory.address, marketId);
    bPool = BPool__factory.attach(bPoolAddress).connect(signer);
    await bPool.approve(ammFactory.address, MAX_APPROVAL);

    const { shareTokens: shareTokenAddresses } = await marketFactory.getMarket(marketId.toString());
    shareTokens = shareTokenAddresses.map((address: string) => collateral.attach(address).connect(secondSigner));
  });

  it("sell shares for collateral", async () => {
    const _outcome = 0;

    const collateralIn = usdcBasis.mul(100); // 100 of the collateral

    const secondSignerAMMFactory = ammFactory.connect(secondSigner);
    const secondMarketFactory = marketFactory.connect(secondSigner);

    const secondCollateral = collateral.connect(secondSigner);
    await secondCollateral.faucet(collateralIn);
    await secondCollateral.approve(secondMarketFactory.address, MAX_APPROVAL);

    const _setsInForCollateral = await secondMarketFactory.calcShares(collateralIn);
    await secondMarketFactory.mintShares(marketId.toString(), _setsInForCollateral, secondSigner.address);

    const setsToBurn = await calculateSellCompleteSetsWithValues(
      secondSignerAMMFactory as AMMFactory,
      marketFactory as AbstractMarketFactory,
      marketId.toString(),
      _outcome,
      _setsInForCollateral
    );

    await shareTokens[_outcome].approve(secondSignerAMMFactory.address, MAX_APPROVAL);
    const collateralBefore = await secondCollateral.balanceOf(secondSigner.address);
    const sharesBefore = await shareTokens[_outcome].balanceOf(secondSigner.address);

    expect(_setsInForCollateral.lte(sharesBefore)).to.be.true;

    await secondSignerAMMFactory.sellForCollateral(
      secondMarketFactory.address,
      marketId,
      _outcome,
      _setsInForCollateral,
      setsToBurn
    );

    const collateralAfter = await secondCollateral.balanceOf(secondSigner.address);

    expect(collateralAfter.gt(collateralBefore)).to.be.true;
  });

  it("should not fail when getting weights/ratios/balances on non-existent pools", async () => {
    const nonExistentMarketId = 10;
    const tokenRatios = await ammFactory.tokenRatios(marketFactory.address, nonExistentMarketId);
    expect(tokenRatios).to.be.empty;

    const poolBalances = await ammFactory.getPoolBalances(marketFactory.address, nonExistentMarketId);
    expect(poolBalances).to.be.empty;

    const poolWeights = await ammFactory.getPoolWeights(marketFactory.address, nonExistentMarketId);
    expect(poolWeights).to.be.empty;
  });

  it("should not be an infinite loop", async () => {
    calculateSellCompleteSets(
      BigNumber.from("1000000000000"),
      0,
      BigNumber.from("11000000000000000000"),
      ["9437597515460458265822", "10012000000000000000000", "10012000000000000000000"].map((b) => BigNumber.from(b)),
      ["1000000000000000000", "20000000000000000000", "29000000000000000000"].map((b) => BigNumber.from(b)),
      BigNumber.from("15000000000000000")
    );
  });

  describe("buy", () => {
    it("should match the contract values", async () => {
      const collateralIn = usdcBasis.mul(100); // 100 of the collateral
      await collateral.faucet(collateralIn.mul(2));
      await collateral.approve(ammFactory.address, collateralIn.mul(2));

      await ammFactory.addLiquidity(marketFactory.address, marketId, collateralIn, ZERO, secondSigner.address);

      const contractResult = await ammFactory.callStatic.buy(
        marketFactory.address,
        marketId,
        BigNumber.from(1),
        collateralIn,
        BigNumber.from(0)
      );

      const result = await buyWithValues(
        ammFactory as AMMFactory,
        marketFactory as AbstractMarketFactory,
        marketId.toNumber(),
        1,
        collateralIn.toString()
      );

      expect(contractResult.sub(result).toString()).to.be.equal("0");
    });
  });

  describe("addLiquidity", () => {
    it("should work", async () => {
      // Use first signer to alter balances in the pool.
      const collateralIn = usdcBasis.mul(1000); // 100 of the collateral
      await collateral.faucet(collateralIn.mul(2));
      await collateral.approve(ammFactory.address, collateralIn.mul(2));

      await ammFactory.addLiquidity(marketFactory.address, marketId, collateralIn, ZERO, secondSigner.address);
    });
  });

  describe("removeLiquidity", () => {
    it("should return shares if pool unbalanced", async () => {
      const secondAmmFactory = ammFactory.connect(secondSigner);

      const secondBPool = bPool.connect(secondSigner);
      await secondBPool.approve(ammFactory.address, MAX_APPROVAL);

      // Use first signer to alter balances in the pool.
      const collateralIn = usdcBasis.mul(100); // 100 of the collateral
      await collateral.faucet(collateralIn.mul(2));
      await collateral.approve(ammFactory.address, collateralIn.mul(2));

      await ammFactory.addLiquidity(marketFactory.address, marketId, collateralIn, ZERO, secondSigner.address);

      await ammFactory.buy(marketFactory.address, marketId, BigNumber.from(1), collateralIn, BigNumber.from(0));

      const collateralBefore = await collateral.balanceOf(secondSigner.address);

      const poolTokens = await secondAmmFactory.getPoolTokenBalance(
        marketFactory.address,
        marketId,
        secondSigner.address
      );

      expect(poolTokens.gt(0), "pool tokens greater than zero").to.be.true;

      const [collateralGained, sharesGained] = await secondAmmFactory.callStatic.removeLiquidity(
        marketFactory.address,
        marketId,
        poolTokens,
        BigNumber.from(0),
        secondSigner.address
      );

      await secondAmmFactory.removeLiquidity(
        marketFactory.address,
        marketId,
        poolTokens,
        BigNumber.from(0),
        secondSigner.address
      );

      const collateralAfter = await collateral.balanceOf(secondSigner.address);

      // Check that we gained collateral.
      expect(collateralAfter.gt(collateralBefore), "collateral gained").to.be.true;

      const sharesAfter = await Promise.all(
        shareTokens.map((shareToken: Contract) =>
          shareToken.balanceOf(secondSigner.address).then((r: BigNumber) => r.toString())
        )
      );

      expect(sharesAfter).to.deep.equal(sharesGained.map((s: BigNumber) => s.toString()));
      expect(sharesAfter).to.deep.equal(["17963113090909090800", "151132827551", "17963113090909090800"]);
    });

    it("liquidity removal for collateral and burn sets", async () => {
      const sharesBefore = await Promise.all(
        shareTokens.map((shareToken: Contract) =>
          shareToken.balanceOf(signer.address).then((r: BigNumber) => r.toString())
        )
      );

      expect(sharesBefore).to.deep.equal(["0", "0", "0"]);

      const collateralBefore = await collateral.balanceOf(signer.address);

      const poolTokens = await ammFactory.getPoolTokenBalance(marketFactory.address, marketId, signer.address);
      await ammFactory.removeLiquidity(marketFactory.address, marketId, poolTokens, BigNumber.from(0), signer.address);

      const collateralAfter = await collateral.balanceOf(signer.address);

      // Check that we gained collateral.
      expect(collateralAfter.gt(collateralBefore)).to.be.true;

      const sharesAfter = await Promise.all(
        shareTokens.map((shareToken: Contract) =>
          shareToken.balanceOf(signer.address).then((r: BigNumber) => r.toString())
        )
      );

      expect(sharesAfter).to.deep.equal(["0", "0", "0"]);
    });
  });
});
