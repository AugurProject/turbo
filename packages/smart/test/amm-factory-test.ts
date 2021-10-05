import { deployments, ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { expect } from "chai";

import {
  AbstractMarketFactoryV2,
  AMMFactory,
  BPool__factory,
  Cash,
  ERC20__factory,
  FeePot,
  MasterChef,
  TrustedMarketFactoryV3,
  TrustedMarketFactoryV3__factory,
} from "../typechain";
import { BigNumber, Contract } from "ethers";
import { calcShareFactor } from "../src";
import { buyWithValues, calculateSellCompleteSets, calculateSellCompleteSetsWithValues } from "../src/bmath";

describe("AMMFactory", () => {
  let BPool__factory: BPool__factory;
  let ERC20__factory: ERC20__factory;

  let signer: SignerWithAddress;
  let secondSigner: SignerWithAddress;
  const outcomeNames = ["No Contest", "Hulk Hogan", "Undertaker"];

  const usdcBasis = BigNumber.from(10).pow(6);
  const stakerFee = 0;
  const settlementFee = BigNumber.from(10).pow(15).mul(5); // 0.5%
  const protocolFee = 0;

  const MAX_APPROVAL = BigNumber.from(2).pow(256).sub(1);
  const ZERO = BigNumber.from(0);
  const BONE = BigNumber.from(10).pow(18);

  const initialLiquidity = usdcBasis.mul(1000); // 1000 of the collateral

  let collateral: Cash;
  let shareFactor: BigNumber;
  let marketFactory: TrustedMarketFactoryV3;
  const marketId = BigNumber.from(1);
  let ammFactory: AMMFactory;
  let masterChef: MasterChef;

  // These are specific to the one market we are dealing with in the tests below.
  let shareTokens: Contract[];
  let bPool: Contract;

  const INVALID_OUTCOME = 0;

  before(async () => {
    BPool__factory = await ethers.getContractFactory("BPool");
    ERC20__factory = await ethers.getContractFactory("ERC20");
  });

  beforeEach(async () => {
    await deployments.fixture();

    [signer, secondSigner] = await ethers.getSigners();

    collateral = (await ethers.getContract("Collateral")) as Cash;
    const feePot = (await ethers.getContract("FeePot")) as FeePot;
    shareFactor = calcShareFactor(await collateral.decimals());
    marketFactory = await new TrustedMarketFactoryV3__factory(signer).deploy(
      signer.address,
      collateral.address,
      shareFactor,
      feePot.address,
      [stakerFee, settlementFee, protocolFee],
      signer.address
    );

    ammFactory = (await ethers.getContract("AMMFactory")) as AMMFactory;
    masterChef = (await ethers.getContract("MasterChef")) as MasterChef;

    const description = "Who will win Wrestlemania III?";
    const odds = calcWeights([2, 49, 49]);
    await marketFactory.createMarket(signer.address, description, outcomeNames, odds);

    const { shareTokens: shareTokenAddresses } = await marketFactory.getMarket(marketId.toString());
    shareTokens = shareTokenAddresses.map((address: string) => collateral.attach(address).connect(secondSigner));
  });

  describe("calculateSellCompleteSets ERR_MAX_IN_RATIO", () => {
    const initialLiquidity = usdcBasis.mul(100);
    const additionalLiquidity = usdcBasis.mul(10);

    beforeEach(async () => {
      await collateral.faucet(initialLiquidity);
      await collateral.approve(ammFactory.address, initialLiquidity);
      await ammFactory.createPool(marketFactory.address, marketId, initialLiquidity, signer.address);

      await collateral.faucet(additionalLiquidity);
      await collateral.approve(ammFactory.address, additionalLiquidity);

      await ammFactory.buy(marketFactory.address, marketId, INVALID_OUTCOME, additionalLiquidity, 0);
    });

    it("should do not revert", async () => {
      const market = await marketFactory.getMarket(marketId);
      const invalidShareToken = ERC20__factory.attach(market.shareTokens[0]);
      const outcomeBalance = await invalidShareToken.balanceOf(signer.address);
      await invalidShareToken.approve(ammFactory.address, outcomeBalance);

      const [tokenAmountOut, _shareTokensIn] = await calculateSellCompleteSetsWithValues(
        ammFactory as AMMFactory,
        (marketFactory as unknown) as AbstractMarketFactoryV2,
        marketId.toString(),
        0,
        outcomeBalance.toString()
      );

      await expect(
        ammFactory.sellForCollateral(marketFactory.address, marketId, INVALID_OUTCOME, _shareTokensIn, tokenAmountOut)
      ).to.not.revertedWith("ERR_MAX_IN_RATIO");
    });
  });

  describe("AMMFactory already has pool", () => {
    beforeEach(async () => {
      await collateral.faucet(initialLiquidity);
      await collateral.approve(ammFactory.address, initialLiquidity);
      await ammFactory.createPool(marketFactory.address, marketId, initialLiquidity, signer.address);
    });

    it("should create rewards pool and add liquidity", async () => {
      const collateralIn = usdcBasis.mul(100); // 100 of the collateral
      await collateral.faucet(collateralIn);
      await collateral.approve(masterChef.address, collateralIn);

      await expect(
        masterChef.addLiquidity(
          ammFactory.address,
          marketFactory.address,
          marketId,
          collateralIn,
          ZERO,
          secondSigner.address
        )
      ).to.not.reverted;

      expect(
        await masterChef.getPoolTokenBalance(ammFactory.address, marketFactory.address, marketId, secondSigner.address)
      ).to.not.equal(ZERO);
    });
  });

  describe("untrusted ammfactory", () => {
    it("should revert", async () => {
      await collateral.faucet(initialLiquidity);
      await collateral.approve(masterChef.address, initialLiquidity);

      // AMM is trusted as part of the deploy.
      await masterChef.untrustAMMFactory(ammFactory.address);
      await expect(
        masterChef.createPool(ammFactory.address, marketFactory.address, marketId, initialLiquidity, signer.address)
      ).to.revertedWith("AMMFactory must be approved to create pool");
    });
  });

  describe("with pool created through MasterChef ", () => {
    beforeEach(async () => {
      await collateral.faucet(initialLiquidity);
      await collateral.approve(masterChef.address, initialLiquidity);

      await masterChef.createPool(
        ammFactory.address,
        marketFactory.address,
        marketId,
        initialLiquidity,
        signer.address
      );

      const bPoolAddress = await ammFactory.getPool(marketFactory.address, marketId);
      bPool = BPool__factory.attach(bPoolAddress).connect(signer);
      await bPool.approve(ammFactory.address, MAX_APPROVAL);
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

      const [tokenAmountOut, _shareTokensIn] = await calculateSellCompleteSetsWithValues(
        secondSignerAMMFactory as AMMFactory,
        (marketFactory as unknown) as AbstractMarketFactoryV2,
        marketId.toString(),
        _outcome,
        _setsInForCollateral.toString()
      );

      await shareTokens[_outcome].approve(secondSignerAMMFactory.address, MAX_APPROVAL);
      const collateralBefore = await secondCollateral.balanceOf(secondSigner.address);
      const sharesBefore = await shareTokens[_outcome].balanceOf(secondSigner.address);

      expect(_setsInForCollateral.lte(sharesBefore)).to.be.true;

      await secondSignerAMMFactory.sellForCollateral(
        secondMarketFactory.address,
        marketId,
        _outcome,
        _shareTokensIn.map((m) => BigNumber.from(m)),
        BigNumber.from(tokenAmountOut)
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
        1,
        BONE.mul(3941),
        ["9437597515460458265822", "10012000000000000000000", "10012000000000000000000"].map((b) => BigNumber.from(b)),
        ["1000000000000000000", "20000000000000000000", "29000000000000000000"].map((b) => BigNumber.from(b)),
        BigNumber.from("15000000000000000")
      );
    });

    it("should not be an infinite loop part 2", async () => {
      const result = calculateSellCompleteSets(
        BigNumber.from("1000000000000"),
        1,
        BONE.mul(3941),
        ["6404637568042191796381", "682774709629804684772", "6404637201061839402829"].map((b) => BigNumber.from(b)),
        ["1000000000000000000", "25500000000000000000", "23500000000000000000"].map((b) => BigNumber.from(b)),
        BigNumber.from("15000000000000000")
      );
    });

    describe("buy", () => {
      it("should match the contract values", async () => {
        const collateralIn = usdcBasis.mul(100); // 100 of the collateral
        await collateral.faucet(collateralIn.mul(2));
        await collateral.approve(ammFactory.address, collateralIn);
        await collateral.approve(masterChef.address, collateralIn);

        await masterChef.addLiquidity(
          ammFactory.address,
          marketFactory.address,
          marketId,
          collateralIn,
          ZERO,
          secondSigner.address
        );

        expect(await bPool.balanceOf(secondSigner.address)).to.equal(0);

        const contractResult = await ammFactory.callStatic.buy(
          marketFactory.address,
          marketId,
          BigNumber.from(1),
          collateralIn,
          BigNumber.from(0)
        );

        const result = await buyWithValues(
          ammFactory as AMMFactory,
          (marketFactory as unknown) as AbstractMarketFactoryV2,
          marketId.toNumber(),
          1,
          collateralIn.toString()
        );

        expect(contractResult.sub(result).toString()).to.be.equal("0");
      });
    });

    describe("addLiquidity", () => {
      const addLiquidity = async function (collateralAmount: number) {
        const collateralIn = usdcBasis.mul(collateralAmount);
        await collateral.faucet(collateralIn);
        await collateral.approve(masterChef.address, collateralIn);

        await masterChef.addLiquidity(
          ammFactory.address,
          marketFactory.address,
          marketId,
          collateralIn,
          ZERO,
          secondSigner.address
        );
      };

      it("with balanced pool", async () => {
        // Use first signer to alter balances in the pool.
        const collateralIn = usdcBasis.mul(1000); // 100 of the collateral
        await collateral.faucet(collateralIn.mul(2));
        await collateral.approve(ammFactory.address, collateralIn);
        await collateral.approve(masterChef.address, collateralIn);

        await masterChef.addLiquidity(
          ammFactory.address,
          marketFactory.address,
          marketId,
          collateralIn,
          ZERO,
          secondSigner.address
        );
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
        // Use first signer to alter balances in the pool.
        const collateralIn = usdcBasis.mul(100); // 100 of the collateral
        await collateral.faucet(collateralIn.mul(2));
        await collateral.approve(ammFactory.address, collateralIn);
        await collateral.approve(masterChef.address, collateralIn);

        await ammFactory.buy(marketFactory.address, marketId, BigNumber.from(1), collateralIn, BigNumber.from(0));

        // Sending the LP tokens to second signer.
        await masterChef.addLiquidity(
          ammFactory.address,
          marketFactory.address,
          marketId,
          collateralIn,
          ZERO,
          secondSigner.address
        );

        const sharesAfter = await Promise.all(
          shareTokens.map((shareToken: Contract) =>
            shareToken.balanceOf(signer.address).then((r: BigNumber) => r.toString())
          )
        );

        expect(sharesAfter).to.deep.equal(["0", "194438690996976578137", "0"]);
      });
    });

    describe("removeLiquidity", () => {
      it("should return shares if pool unbalanced", async () => {
        const secondMasterChef = masterChef.connect(secondSigner);

        // Use first signer to alter balances in the pool.
        const collateralIn = usdcBasis.mul(100); // 100 of the collateral
        await collateral.faucet(collateralIn.mul(2));
        await collateral.approve(ammFactory.address, collateralIn);
        await collateral.approve(masterChef.address, collateralIn);

        // Sending the LP tokens to second signer.
        await masterChef.addLiquidity(
          ammFactory.address,
          marketFactory.address,
          marketId,
          collateralIn,
          ZERO,
          secondSigner.address
        );

        const sharesBefore = await Promise.all(
          shareTokens.map((shareToken: Contract) =>
            shareToken.balanceOf(secondSigner.address).then((r: BigNumber) => r.toString())
          )
        );

        await ammFactory.buy(marketFactory.address, marketId, BigNumber.from(1), collateralIn, BigNumber.from(0));

        const collateralBefore = await collateral.balanceOf(secondSigner.address);

        const poolTokens = await secondMasterChef.getPoolTokenBalance(
          ammFactory.address,
          marketFactory.address,
          marketId,
          secondSigner.address
        );

        expect(poolTokens.gt(0), "pool tokens greater than zero").to.be.true;

        const [collateralGained, sharesGained] = await secondMasterChef.callStatic.removeLiquidity(
          ammFactory.address,
          marketFactory.address,
          marketId,
          poolTokens,
          BigNumber.from(0),
          secondSigner.address
        );

        await secondMasterChef.removeLiquidity(
          ammFactory.address,
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

        expect(collateralGained).to.equal(collateralAfter.sub(collateralBefore));
        expect(sharesAfter).to.deep.equal(
          sharesGained.map((s: BigNumber, index: number) => s.add(sharesBefore[index]).toString())
        );
        expect(sharesAfter).to.deep.equal(["17749210090909091709", "232282729145", "17749210090909091709"]);
      });

      it("liquidity removal for collateral and burn sets", async () => {
        const sharesBefore = await Promise.all(
          shareTokens.map((shareToken: Contract) =>
            shareToken.balanceOf(signer.address).then((r: BigNumber) => r.toString())
          )
        );

        expect(sharesBefore).to.deep.equal(["0", "0", "0"]);

        const collateralBefore = await collateral.balanceOf(signer.address);

        const poolTokens = await masterChef.getPoolTokenBalance(
          ammFactory.address,
          marketFactory.address,
          marketId,
          signer.address
        );
        await masterChef.removeLiquidity(
          ammFactory.address,
          marketFactory.address,
          marketId,
          poolTokens,
          BigNumber.from(0),
          signer.address
        );

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

    describe("add, remove and add again", () => {
      it("should not blowup.", async () => {
        const collateralIn = usdcBasis.mul(1000);
        await collateral.faucet(collateralIn);
        await collateral.approve(masterChef.address, collateralIn);

        const lpTokenBal = await masterChef.getPoolTokenBalance(
          ammFactory.address,
          marketFactory.address,
          marketId,
          signer.address
        );
        await masterChef.removeLiquidity(
          ammFactory.address,
          marketFactory.address,
          marketId,
          lpTokenBal,
          ZERO,
          signer.address
        );
        await masterChef.addLiquidity(
          ammFactory.address,
          marketFactory.address,
          marketId,
          collateralIn,
          ZERO,
          signer.address
        );
      });
    });

    it("removing liquidity after market resolution works", async () => {
      const winningOutcome = 1;
      expect(await marketFactory.isMarketResolved(marketId)).to.be.false;
      await marketFactory.trustedResolveMarket(marketId, winningOutcome);
      expect(await marketFactory.isMarketResolved(marketId)).to.be.true;

      const lpTokens = await masterChef.getPoolTokenBalance(
        ammFactory.address,
        marketFactory.address,
        marketId,
        signer.address
      );
      await masterChef.removeLiquidity(
        ammFactory.address,
        marketFactory.address,
        marketId,
        lpTokens,
        0,
        signer.address
      );
    });
  });
});

function calcWeights(ratios: number[]): BigNumber[] {
  const basis = BigNumber.from(10).pow(18);
  const max = basis.mul(50);

  const total = ratios.reduce((total, x) => total + x, 0);
  const factor = max.div(total); // TODO this doesn't work if total is too large
  return ratios.map((r) => factor.mul(r));
}
