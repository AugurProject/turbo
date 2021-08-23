import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { expect } from "chai";
import * as factoryABI from '@balancer-labs/v2-deployments/deployed/mainnet/WeightedPoolFactory.json';

import {
  AbstractMarketFactoryV2,
  AMMFactory,
  AMMFactoryV2,
  AMMFactoryV2__factory,
  TrustedMarketFactory,
  TrustedMarketFactory__factory,
} from "../typechain";
import { BigNumber, Contract, ContractFactory } from "ethers";
import { calcShareFactor } from "../src";
import { buyWithValues, calculateSellCompleteSets, calculateSellCompleteSetsWithValues } from "../src/bmath";

describe("AMMFactoryV2", function () {
  // set timeout is unlimited.
  this.timeout(0);
  let WeightedPoolFactory__factory: ContractFactory;
  let WeightedPool__factory: ContractFactory;
  let Cash__factory: ContractFactory;
  let FeePot__factory: ContractFactory;
  let Vault__factory: ContractFactory;

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
  const BONE = BigNumber.from(10).pow(18);

  let collateral: Contract;
  let shareFactor: BigNumber;
  let marketFactory: TrustedMarketFactory;
  const marketId = BigNumber.from(1);
  let weightedPoolFactory: Contract;
  let ammFactory: AMMFactoryV2;

  // These are specific to the one market we are dealing with in the tests below.
  let shareTokens: Contract[];
  let balancerPool: Contract;

  before(async () => {
    [signer, secondSigner] = await ethers.getSigners();
    WeightedPoolFactory__factory = new ethers.ContractFactory(factoryABI.abi, factoryABI.bytecode, signer);
    WeightedPool__factory = await ethers.getContractFactory("WeightedPool");
    Cash__factory = await ethers.getContractFactory("Cash");
    Vault__factory = await ethers.getContractFactory("Vault");
    FeePot__factory = await ethers.getContractFactory("FeePot");
  });

  beforeEach(async () => {
    [signer, secondSigner] = await ethers.getSigners();
    collateral = await Cash__factory.deploy("USDC", "USDC", 6); // 6 decimals to mimic USDC
    const reputationToken = await Cash__factory.deploy("REPv2", "REPv2", 18);
    const feePot = await FeePot__factory.deploy(collateral.address, reputationToken.address);
    shareFactor = calcShareFactor(await collateral.decimals());
    marketFactory = await new TrustedMarketFactory__factory(signer).deploy(
      signer.address,
      collateral.address,
      shareFactor,
      feePot.address,
      stakerFee,
      settlementFee,
      signer.address,
      protocolFee
    );

    const Authorizer = await ethers.getContractFactory('Authorizer');
    const authorizer = await Authorizer.deploy(signer.address); // signer is admin
    const vault = await Vault__factory.deploy(authorizer.address, ethers.constants.AddressZero, BigNumber.from("0"), BigNumber.from("0"));
    weightedPoolFactory = await WeightedPoolFactory__factory.deploy(vault.address);
    ammFactory = await new AMMFactoryV2__factory(signer).deploy(weightedPoolFactory.address, swapFee);

    const endTime = BigNumber.from(Date.now())
      .div(1000)
      .add(60 * 60 * 24); // one day
    const description = "Who will win Wrestlemania III?";
    const odds = calcWeights([2, 49, 49]);
    await marketFactory.createMarket(signer.address, endTime, description, outcomeNames, outcomeSymbols, odds);

    const initialLiquidity = usdcBasis.mul(1000); // 1000 of the collateral
    await collateral.faucet(initialLiquidity);
    await collateral.approve(ammFactory.address, initialLiquidity);

    await ammFactory.createPool(marketFactory.address, marketId, initialLiquidity, signer.address);

    const weightedPoolAddress = await ammFactory.getPool(marketFactory.address, marketId);
    balancerPool = WeightedPool__factory.attach(weightedPoolAddress).connect(signer);
    await balancerPool.approve(ammFactory.address, MAX_APPROVAL);

    const { shareTokens: shareTokenAddresses } = await marketFactory.getMarket(marketId.toString());
    shareTokens = shareTokenAddresses.map((address: string) => collateral.attach(address).connect(secondSigner))
  });

  it("Check pool parameter", async () => {
    // check fee
    expect(await ammFactory.getSwapFee(marketFactory.address, marketId)).equal(swapFee);
    // check balance 
    expect(await ammFactory.getPoolBalances(marketFactory.address, marketId)).deep.equal(new Array(3).fill(BONE.mul("1000")));
    // check weights
    let weights = ['20000000000000000', '490000000000000000', '490000000000000000'].map((value, index) => { return { value, index } })
      .sort((a, b) => {
        let indexA = a.index;
        let indexB = b.index;
        if (shareTokens[indexA].address < shareTokens[indexB].address)
          return -1;
        if (shareTokens[indexA].address > shareTokens[indexB].address)
          return 1;
        return 0;
      }).map(pair => BigNumber.from(pair.value));

    expect(await ammFactory.getPoolWeights(marketFactory.address, marketId)).deep.equal(weights);
    // check pool token balance
    expect(await ammFactory.getPoolTokenBalance(marketFactory.address, marketId, secondSigner.address)).to.equal(ZERO);
    expect(await ammFactory.getPoolTokenBalance(marketFactory.address, marketId, signer.address)).gt(ZERO);
  })

  it("sell shares for collateral", async () => {
    const _outcome = reOrderTokens(shareTokens, [0, 1, 2])[0];

    const collateralIn = usdcBasis.mul(100); // 100 of the collateral

    const secondSignerAMMFactory = ammFactory.connect(secondSigner);

    const secondMarketFactory = marketFactory.connect(secondSigner);

    const secondCollateral = collateral.connect(secondSigner);
    await secondCollateral.faucet(collateralIn);
    await secondCollateral.approve(secondMarketFactory.address, MAX_APPROVAL);

    const _setsInForCollateral = await secondMarketFactory.calcShares(collateralIn);
    await secondMarketFactory.mintShares(marketId.toString(), _setsInForCollateral, secondSigner.address);
    
    const [tokenAmountOut, _shareTokensIn] = await calculateSellCompleteSetsWithValues(
      secondSignerAMMFactory as AMMFactoryV2,
      (marketFactory as unknown) as AbstractMarketFactoryV2,
      marketId.toString(),
      _outcome,
      _setsInForCollateral.toString()
    );
    
    await shareTokens[_outcome].approve(secondSignerAMMFactory.address, MAX_APPROVAL);
    const collateralBefore = await secondCollateral.balanceOf(secondSigner.address);
    const sharesBefore = await shareTokens[_outcome].balanceOf(secondSigner.address);

    expect(_setsInForCollateral.lte(sharesBefore)).to.be.true;

    const _shareTokensInOrder = reOrderTokens(shareTokens, _shareTokensIn);

    await secondSignerAMMFactory.sellForCollateral(
      secondMarketFactory.address,
      marketId,
      _outcome,
      _shareTokensInOrder.map((m) => BigNumber.from(m)),
      BigNumber.from(tokenAmountOut)
    );
    const collateralAfter = await secondCollateral.balanceOf(secondSigner.address);
    expect(collateralAfter.gt(collateralBefore)).to.be.true;
  });

  describe("addLiquidity", () => {
    const addLiquidity = async function (collateralAmount: number) {
      const collateralIn = usdcBasis.mul(collateralAmount);
      await collateral.faucet(collateralIn);
      await collateral.approve(ammFactory.address, collateralIn);

      await ammFactory.addLiquidity(marketFactory.address, marketId, collateralIn, ZERO, secondSigner.address);
    };
    const addTest = function (a: number, b: number, c: number) {
      // TODO unskip these when we figure out why they take so long to run
      it.skip(`addLiquidity check: ${a}, ${b}, ${c}`, async () => {
        await addLiquidity(a);
        await addLiquidity(b);
        await addLiquidity(c);
      });
    };

    const randomValues = [1500, 5000, 100000, 500000, 750000];
    const numberOfValues = randomValues.length;
    for (let i = 0; i < Math.pow(randomValues.length, 3); i++) {
      const s = i.toString(numberOfValues).padStart(3, "0");

      const a = parseInt(s[2], numberOfValues);
      const b = parseInt(s[1], numberOfValues);
      const c = parseInt(s[0], numberOfValues);

      addTest(randomValues[a], randomValues[b], randomValues[c]);
    }

    it("with balanced pool", async () => {
      // Use first signer to alter balances in the pool.
      const collateralIn = usdcBasis.mul(1000); // 100 of the collateral
      await collateral.faucet(collateralIn.mul(2));
      await collateral.approve(ammFactory.address, collateralIn.mul(2));

      await ammFactory.addLiquidity(marketFactory.address, marketId, collateralIn, ZERO, secondSigner.address);
      const sharesAfter = await Promise.all(
        shareTokens.map((shareToken: Contract) =>
          shareToken.balanceOf(signer.address).then((r: BigNumber) => r.toString())
        )
      );

      // The pool is even right now so we wouldn't expect any shares.
      expect(sharesAfter).to.deep.equal(["0", "0", "0"]);
    });

    it("huge amount with balanced pool", async () => {
      await addLiquidity(5000);
      await addLiquidity(100000);

      const sharesAfter = await Promise.all(
        shareTokens.map((shareToken: Contract) =>
          shareToken.balanceOf(signer.address).then((r: BigNumber) => r.toString())
        )
      );

      // The pool is even right now so we wouldn't expect any shares.
      expect(sharesAfter).to.deep.equal(["0", "0", "0"]);
    });

    it("with unbalanced pool", async () => {
      const secondBPool = balancerPool.connect(secondSigner);
      await secondBPool.approve(ammFactory.address, MAX_APPROVAL);

      // Use first signer to alter balances in the pool.
      const collateralIn = usdcBasis.mul(100); // 100 of the collateral
      await collateral.faucet(collateralIn.mul(2));
      await collateral.approve(ammFactory.address, collateralIn.mul(2));

      await ammFactory.buy(marketFactory.address, marketId, BigNumber.from(1), collateralIn, BigNumber.from(0));

      // Sending the LP tokens to second signer.
      await ammFactory.addLiquidity(marketFactory.address, marketId, collateralIn, ZERO, secondSigner.address);

      const sharesAfter = await Promise.all(
        shareTokens.map((shareToken: Contract) =>
          shareToken.balanceOf(signer.address).then((r: BigNumber) => r.toString())
        )
      );
      // expect(sharesAfter).to.deep.equal(["0", "193151727304627160820", "0"]);
      // it change because in addLiquidity function we add all set to pool
      expect(sharesAfter).to.deep.equal(["0", "193151727306112782433", "0"]);
    });
  });

  describe("removeLiquidity", () => {
    it("should return shares if pool unbalanced", async () => {
      const secondAmmFactory = ammFactory.connect(secondSigner);

      const secondBPool = balancerPool.connect(secondSigner);
      await secondBPool.approve(ammFactory.address, MAX_APPROVAL);

      // Use first signer to alter balances in the pool.
      const collateralIn = usdcBasis.mul(100); // 100 of the collateral
      await collateral.faucet(collateralIn.mul(2));
      await collateral.approve(ammFactory.address, collateralIn.mul(2));

      // Sending the LP tokens to second signer.
      await (await ammFactory.addLiquidity(marketFactory.address, marketId, collateralIn, ZERO, secondSigner.address)).wait();

      const sharesBefore = await Promise.all(
        shareTokens.map((shareToken: Contract) =>
          shareToken.balanceOf(secondSigner.address).then((r: BigNumber) => r.toString())
        )
      );

      await (await ammFactory.buy(marketFactory.address, marketId, BigNumber.from(1), collateralIn, BigNumber.from(0))).wait();

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

      expect(sharesAfter).to.deep.equal(
        sharesGained.map((s: BigNumber, index: number) => s.add(sharesBefore[index]).toString())
      );
      // expect(sharesAfter).to.deep.equal(["17630229090909091709", "484905048517", "17630229090909091709"]);
      expect(sharesAfter).to.deep.equal(["17630229090876351200", "484810716773", "17630229090876351200"]);
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

      expect(sharesAfter).to.deep.equal(["999999666000", "999999666000", "999999666000"]);
    });
  });

  describe("add, remove and add again", () => {
    it("should not blowup.", async () => {
      const collateralIn = usdcBasis.mul(1000);
      await collateral.faucet(collateralIn);
      await collateral.approve(ammFactory.address, collateralIn);

      const lpTokenBal = await balancerPool.balanceOf(signer.address);
      await ammFactory.removeLiquidity(marketFactory.address, marketId, lpTokenBal, ZERO, signer.address);
      await ammFactory.addLiquidity(marketFactory.address, marketId, collateralIn, ZERO, signer.address);
    });
  });

  it("removing liquidity after market resolution works", async () => {
    const winningOutcome = 1;
    expect(await marketFactory.isMarketResolved(marketId)).to.be.false;
    await marketFactory.trustedResolveMarket(marketId, winningOutcome);
    expect(await marketFactory.isMarketResolved(marketId)).to.be.true;
    const lpTokens = await balancerPool.balanceOf(signer.address);
    await ammFactory.removeLiquidity(marketFactory.address, marketId, lpTokens, 0, signer.address);
  });
});

function calcWeights(ratios: number[]): BigNumber[] {
  const basis = BigNumber.from(10).pow(18);
  const max = basis.mul(50);

  const total = ratios.reduce((total, x) => total + x, 0);
  const factor = max.div(total); // TODO this doesn't work if total is too large
  return ratios.map((r) => factor.mul(r));
}

function reOrderTokens(shareTokens: Contract[], amounts: any[]) {
  let shareTokensOrder = shareTokens.map(self => self).sort((a, b) => {
    if (BigNumber.from(a.address) < BigNumber.from(b.address))
      return -1; 
    if (BigNumber.from(a.address) > BigNumber.from(b.address))
      return 1; 
    return 0;
  }); 

  let amountsOrder = new Array(amounts.length);

  shareTokens.forEach((tokens, index) => {
    let matchId = shareTokensOrder.findIndex(_tokenOrder => _tokenOrder.address == tokens.address);
    amountsOrder[index] = amounts[matchId];
  })
  return amountsOrder;
}