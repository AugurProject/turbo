import { deployments, ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { expect } from "chai";

import {
  AbstractMarketFactoryV2,
  AMMFactory,
  BPool__factory,
  Cash,
  FeePot,
  MasterChef,
  TrustedMarketFactoryV3,
  TrustedMarketFactoryV3__factory,
} from "../typechain";
import { BigNumber, Contract, BigNumberish } from "ethers";
import { calcShareFactor } from "../src";

describe("AMMFactory", () => {
  let BPool__factory: BPool__factory;

  let signer: SignerWithAddress;
  let secondSigner: SignerWithAddress;
  let thirdSigner: SignerWithAddress;
  const outcomeNames = ["No Contest", "Hulk Hogan", "Undertaker"];

  const usdcBasis = BigNumber.from(10).pow(6);
  const stakerFee = 0;
  const settlementFee = BigNumber.from(10).pow(15).mul(5); // 0.5%
  const protocolFee = 0;

  const MAX_APPROVAL = BigNumber.from(2).pow(256).sub(1);
  const ZERO = BigNumber.from(0);
  const BONE = BigNumber.from(10).pow(18);

  let collateral: Cash;
  let rewardsToken: Cash;
  let marketFactory: TrustedMarketFactoryV3;
  const marketId = BigNumber.from(1);
  let ammFactory: AMMFactory;

  let masterChef: MasterChef;

  // These are specific to the one market we are dealing with in the tests below.
  let shareTokens: Contract[];
  let bPool: Contract;

  let initialLiquidity: BigNumber;

  beforeEach(async () => {
    await deployments.fixture();

    [signer, secondSigner, thirdSigner] = await ethers.getSigners();

    const feePot = (await ethers.getContract("FeePot")) as FeePot;

    BPool__factory = (await ethers.getContractFactory("BPool")) as BPool__factory;

    ammFactory = (await ethers.getContract("AMMFactory")) as AMMFactory;
    collateral = (await ethers.getContract("Collateral")) as Cash;
    masterChef = (await ethers.getContract("MasterChef")) as MasterChef;
    rewardsToken = (await ethers.getContract("WrappedMatic")) as Cash;
    const shareFactor = calcShareFactor(await collateral.decimals());

    marketFactory = await new TrustedMarketFactoryV3__factory(signer).deploy(
      signer.address,
      collateral.address,
      shareFactor,
      feePot.address,
      [stakerFee, settlementFee, protocolFee],
      signer.address
    );

    ammFactory = (await ethers.getContract("AMMFactory")) as AMMFactory;

    await masterChef.addRewards(marketFactory.address, BONE.mul(95), 10, 0);

    const description = "Who will win Wrestlemania III?";
    const odds = calcWeights([2, 49, 49]);
    await marketFactory.createMarket(signer.address, description, outcomeNames, odds);

    initialLiquidity = usdcBasis.mul(1000); // 1000 of the collateral
    await collateral.faucet(initialLiquidity);
    await collateral.approve(ammFactory.address, initialLiquidity);
    await ammFactory.createPool(marketFactory.address, marketId, initialLiquidity, signer.address);

    const bPoolAddress = await ammFactory.getPool(marketFactory.address, marketId);
    bPool = BPool__factory.attach(bPoolAddress).connect(signer);
    await bPool.approve(ammFactory.address, MAX_APPROVAL);
  });

  let firstLP: SignerWithAddress, secondLP: SignerWithAddress, thirdLP: SignerWithAddress;

  const addLiquidityFrom = async (_signer: SignerWithAddress, _collateralAmount: BigNumberish) => {
    await collateral.connect(_signer).faucet(_collateralAmount);
    await collateral.connect(_signer).approve(ammFactory.address, _collateralAmount);

    return await ammFactory
      .connect(_signer)
      .addLiquidity(marketFactory.address, marketId, _collateralAmount, ZERO, _signer.address);
  };

  const addLiquidityFromOffchain = async (_signer: SignerWithAddress, _collateralAmount: BigNumber) => {
    await collateral.connect(_signer).faucet(_collateralAmount);
    await collateral.connect(_signer).approve(ammFactory.address, _collateralAmount);

    return await ammFactory
      .connect(_signer)
      .callStatic.addLiquidity(marketFactory.address, marketId, _collateralAmount, ZERO, _signer.address);
  };

  const removeLiquidityFrom = async (_singer: SignerWithAddress, _lpAmount: BigNumberish) => {
    return await ammFactory
      .connect(_singer)
      .removeLiquidity(marketFactory.address, marketId, _lpAmount, ZERO, _singer.address);
  };
  // set day
  const setBlockTimestamp = async (date: number) => {
    await ethers.provider.send("evm_setNextBlockTimestamp", [date]);
    await ethers.provider.send("evm_mine", []);
  };

  let firstPoolAmount: BigNumber, secondPoolAmount: BigNumber, thirdPoolAmount: BigNumber;

  describe("10 day, 1 join after pool create, 1 join after 1 day, exit after 2 days", () => {
    let now;
    beforeEach(async () => {
      [firstLP, secondLP, thirdLP] = (await ethers.getSigners()).slice(1);

      const oneDay = 60 * 60 * 24;
      const collateralAmount = usdcBasis.mul(100);
      now = Math.floor(Date.now() / 1000);

      // join the market
      [firstPoolAmount] = await addLiquidityFromOffchain(firstLP, collateralAmount);
      await addLiquidityFrom(firstLP, collateralAmount);

      // set block timestamp to the next day.
      await setBlockTimestamp(now + oneDay);

      // join the market
      [secondPoolAmount] = await addLiquidityFromOffchain(secondLP, collateralAmount);
      await addLiquidityFrom(secondLP, collateralAmount);

      await setBlockTimestamp(now + 2 * oneDay);
    });

    it("who join pool first should receive more reward", async () => {
      // withdraw same amount

      const poolAmountOut = firstPoolAmount.gt(secondPoolAmount) ? secondPoolAmount : firstPoolAmount;
      // remove pool
      await removeLiquidityFrom(firstLP, BigNumber.from(poolAmountOut));
      // remove pool
      await removeLiquidityFrom(secondLP, BigNumber.from(poolAmountOut));

      const firstLpReward = await rewardsToken.balanceOf(firstLP.address);
      const secondLPReward = await rewardsToken.balanceOf(secondLP.address);

      console.log(firstLpReward.toString(), secondLPReward.toString(), firstLpReward.div(secondLPReward).toString());
      expect(firstLpReward.div(secondLPReward)).to.equal(2);
      expect(firstLpReward).gte(secondLPReward);
    });
  });

  describe("10 day, 1 join after 1 day, 1 join after 1.5 day, exit after 2 days", () => {
    let now;
    beforeEach(async () => {
      [firstLP, secondLP, thirdLP] = (await ethers.getSigners()).slice(1);

      const oneDay = 60 * 60 * 24;
      const collateralAmount = usdcBasis.mul(100);
      now = Math.floor(Date.now() / 1000);
      // set block timestamp to the next day.
      await setBlockTimestamp(now + oneDay);

      // join the market
      [firstPoolAmount] = await addLiquidityFromOffchain(firstLP, collateralAmount);
      await addLiquidityFrom(firstLP, collateralAmount);

      await setBlockTimestamp(now + (oneDay * 3) / 2);

      // join the market
      [secondPoolAmount] = await addLiquidityFromOffchain(secondLP, collateralAmount);
      await addLiquidityFrom(secondLP, collateralAmount);

      await setBlockTimestamp(now + 2 * oneDay);
    });

    it("who join pool first should receive more reward", async () => {
      // withdraw same amount

      const poolAmountOut = firstPoolAmount.gt(secondPoolAmount) ? secondPoolAmount : firstPoolAmount;
      // remove pool
      await removeLiquidityFrom(firstLP, BigNumber.from(poolAmountOut));
      // remove pool
      await removeLiquidityFrom(secondLP, BigNumber.from(poolAmountOut));
      const firstLpReward = await rewardsToken.balanceOf(firstLP.address);
      const secondLPReward = await rewardsToken.balanceOf(secondLP.address);

      console.log(firstLpReward.toString(), secondLPReward.toString(), firstLpReward.div(secondLPReward).toString());
      expect(firstLpReward.div(secondLPReward)).to.equal(2);
      expect(firstLpReward).gte(secondLPReward);
    });
  });

  describe("10 day, 1 join after 1 day, 1 join after 1.5 day, exit after 2 days, third guy join at 3 day", () => {
    let now: number;
    beforeEach(async () => {
      [firstLP, secondLP, thirdLP] = (await ethers.getSigners()).slice(1);

      const oneDay = 60 * 60 * 24;
      const collateralAmount = usdcBasis.mul(100);
      now = Math.floor(Date.now() / 1000);
      // set block timestamp to the next day.
      await setBlockTimestamp(now + oneDay);

      // join the market
      [firstPoolAmount] = await addLiquidityFromOffchain(firstLP, collateralAmount);
      await addLiquidityFrom(firstLP, collateralAmount);

      await setBlockTimestamp(now + (oneDay * 3) / 2);

      // join the market
      [secondPoolAmount] = await addLiquidityFromOffchain(secondLP, collateralAmount);
      await addLiquidityFrom(secondLP, collateralAmount);

      await setBlockTimestamp(now + 2 * oneDay);

      [thirdPoolAmount] = await addLiquidityFromOffchain(thirdLP, collateralAmount);
      await addLiquidityFrom(thirdLP, collateralAmount);
    });

    it("who join pool first should receive more reward", async () => {
      // withdraw same amount

      const poolAmountOut = firstPoolAmount.gt(secondPoolAmount) ? secondPoolAmount : firstPoolAmount;
      // remove pool
      await removeLiquidityFrom(firstLP, BigNumber.from(poolAmountOut));
      // remove pool
      await removeLiquidityFrom(secondLP, BigNumber.from(poolAmountOut));

      const firstLpReward = await rewardsToken.balanceOf(firstLP.address);
      const secondLPReward = await rewardsToken.balanceOf(secondLP.address);

      console.log(firstLpReward.toString(), secondLPReward.toString(), firstLpReward.div(secondLPReward).toString());
      expect(firstLpReward.div(secondLPReward)).to.equal(2);
      expect(firstLpReward).gte(secondLPReward);

      await setBlockTimestamp(now + 3 * 60 * 60 * 24);

      await removeLiquidityFrom(thirdLP, thirdPoolAmount);

      const thirdReward = await rewardsToken.balanceOf(thirdLP.address);

      console.log(firstLpReward.toString(), thirdReward.toString(), thirdReward.div(firstLpReward).toString());
    });
  });

  describe("10 day, first join at day 1, second guy join at 1.5day, first exit pool at 1.5day, second guy exit at 2day", () => {
    let now: number;
    beforeEach(async () => {
      [firstLP, secondLP, thirdLP] = (await ethers.getSigners()).slice(1);

      const oneDay = 60 * 60 * 24;
      const collateralAmount = usdcBasis.mul(100);
      now = Math.floor(Date.now() / 1000);
      // set block timestamp to the next day.
      await setBlockTimestamp(now + oneDay);

      // join the market
      [firstPoolAmount] = await addLiquidityFromOffchain(firstLP, collateralAmount);
      await addLiquidityFrom(firstLP, collateralAmount);

      await setBlockTimestamp(now + (oneDay * 3) / 2);

      // remove pool
      await removeLiquidityFrom(firstLP, BigNumber.from(firstPoolAmount));
      // join the market
      [secondPoolAmount] = await addLiquidityFromOffchain(secondLP, collateralAmount);
      await addLiquidityFrom(secondLP, collateralAmount);

      await setBlockTimestamp(now + 2 * oneDay);
    });

    it("who join pool first should receive more reward", async () => {
      // withdraw same amount

      // remove pool
      await removeLiquidityFrom(secondLP, BigNumber.from(secondPoolAmount));

      const firstLpReward = await rewardsToken.balanceOf(firstLP.address);
      const secondLPReward = await rewardsToken.balanceOf(secondLP.address);

      console.log(firstLpReward.toString(), secondLPReward.toString(), firstLpReward.div(secondLPReward).toString());
      expect(firstLpReward.div(secondLPReward)).to.equal(1);
      expect(firstLpReward).gte(secondLPReward);
    });
  });

  describe("10 day, first join at day 1, second guy join at 1.5day, first exit pool at 1.5day, second guy exit at 2day", () => {
    let now;
    beforeEach(async () => {
      [firstLP, secondLP, thirdLP] = (await ethers.getSigners()).slice(1);

      const oneDay = 60 * 60 * 24;
      const collateralAmount = usdcBasis.mul(100);
      now = Math.floor(Date.now() / 1000);
      // set block timestamp to the next day.
      await setBlockTimestamp(now + oneDay);

      // join the market
      [firstPoolAmount] = await addLiquidityFromOffchain(firstLP, collateralAmount);
      await addLiquidityFrom(firstLP, collateralAmount);

      await setBlockTimestamp(now + (oneDay * 3) / 2);

      // remove pool
      await removeLiquidityFrom(firstLP, BigNumber.from(firstPoolAmount));
      // join the market
      [secondPoolAmount] = await addLiquidityFromOffchain(secondLP, collateralAmount);
      await addLiquidityFrom(secondLP, collateralAmount);

      await setBlockTimestamp(now + 2 * oneDay);
    });

    it("who join pool first should receive more reward", async () => {
      // remove pool
      await removeLiquidityFrom(secondLP, BigNumber.from(secondPoolAmount));

      const firstLpReward = await rewardsToken.balanceOf(firstLP.address);
      const secondLPReward = await rewardsToken.balanceOf(secondLP.address);

      console.log(firstLpReward.toString(), secondLPReward.toString(), firstLpReward.div(secondLPReward).toString());
      expect(firstLpReward.div(secondLPReward)).to.equal(1);
      expect(firstLpReward).gte(secondLPReward);
    });
  });

  describe("add 100 usd, withdraw half after 1 minute and all after 2 minutes", () => {
    let now: number;
    beforeEach(async () => {
      [firstLP, secondLP, thirdLP] = (await ethers.getSigners()).slice(1);
      const collateralAmount = usdcBasis.mul(100);
      now = Math.floor(Date.now() / 1000);
      // join the market
      [firstPoolAmount] = await addLiquidityFromOffchain(firstLP, collateralAmount);
      await addLiquidityFrom(firstLP, collateralAmount);

      [secondPoolAmount] = await addLiquidityFromOffchain(secondLP, collateralAmount);
      await addLiquidityFrom(secondLP, collateralAmount);
    });

    it("who join pool first should receive more reward", async () => {
      // set block timestamp to the next minutes.
      await setBlockTimestamp(now + 60);
      await removeLiquidityFrom(firstLP, firstPoolAmount.div(2));

      // set block timestamp to the next minutes.
      await setBlockTimestamp(now + 2 * 60);
      await removeLiquidityFrom(firstLP, firstPoolAmount.div(2));
      await removeLiquidityFrom(secondLP, secondPoolAmount);

      const firstAmount = await rewardsToken.balanceOf(firstLP.address);
      const secondAmount = await rewardsToken.balanceOf(secondLP.address);

      console.log(firstAmount.toString(), secondAmount.toString());
      const raito = firstAmount.mul(BONE).div(secondAmount);
      console.log(`ratio = ${formatRatio(raito)}`);
    });
  });
  describe("add 10000 usd, withdraw half after 1 minute and all after 2 minutes", () => {
    let now: number;
    beforeEach(async () => {
      [firstLP, secondLP, thirdLP] = (await ethers.getSigners()).slice(1);
      const collateralAmount = usdcBasis.mul(10000);
      now = Math.floor(Date.now() / 1000);
      // join the market
      [firstPoolAmount] = await addLiquidityFromOffchain(firstLP, collateralAmount);
      await addLiquidityFrom(firstLP, collateralAmount);

      [secondPoolAmount] = await addLiquidityFromOffchain(secondLP, collateralAmount);
      await addLiquidityFrom(secondLP, collateralAmount);
    });

    it("who join pool first should receive more reward", async () => {
      // set block timestamp to the next minutes.
      await setBlockTimestamp(now + 60);
      await removeLiquidityFrom(firstLP, firstPoolAmount.div(2));

      // set block timestamp to the next minutes.
      await setBlockTimestamp(now + 2 * 60);
      await removeLiquidityFrom(firstLP, firstPoolAmount.div(2));
      await removeLiquidityFrom(secondLP, secondPoolAmount);

      const firstAmount = await rewardsToken.balanceOf(firstLP.address);
      const secondAmount = await rewardsToken.balanceOf(secondLP.address);

      console.log(firstAmount.toString(), secondAmount.toString());
      const raito = firstAmount.mul(BONE).div(secondAmount);
      console.log(`ratio = ${formatRatio(raito)}`);
    });
  });

  describe("add 100000 usd, withdraw half after 1 minute and all after 2 minutes", () => {
    let now: number;
    beforeEach(async () => {
      [firstLP, secondLP, thirdLP] = (await ethers.getSigners()).slice(1);
      const collateralAmount = usdcBasis.mul(100000);
      now = Math.floor(Date.now() / 1000);
      // join the market
      [firstPoolAmount] = await addLiquidityFromOffchain(firstLP, collateralAmount);
      await addLiquidityFrom(firstLP, collateralAmount);

      [secondPoolAmount] = await addLiquidityFromOffchain(secondLP, collateralAmount);
      await addLiquidityFrom(secondLP, collateralAmount);
    });

    it("who join pool first should receive more reward", async () => {
      // set block timestamp to the next minutes.
      await setBlockTimestamp(now + 60);
      await removeLiquidityFrom(firstLP, firstPoolAmount.div(2));

      // set block timestamp to the next minutes.
      await setBlockTimestamp(now + 2 * 60);
      await removeLiquidityFrom(firstLP, firstPoolAmount.div(2));
      await removeLiquidityFrom(secondLP, secondPoolAmount);

      const firstAmount = await rewardsToken.balanceOf(firstLP.address);
      const secondAmount = await rewardsToken.balanceOf(secondLP.address);

      console.log(firstAmount.toString(), secondAmount.toString());
      const raito = firstAmount.mul(BONE).div(secondAmount);
      console.log(`ratio = ${formatRatio(raito)}`);
    });
  });
  describe("add 100 usd, first LP join at begin withdraw after 8 hours, second LP join at 4 hours and withdraw at 12 hours", () => {
    let now: number;
    beforeEach(async () => {
      [firstLP, secondLP, thirdLP] = (await ethers.getSigners()).slice(1);
      now = Math.floor(Date.now() / 1000);
    });

    it("who join pool first should receive more reward", async () => {
      // join the market
      const hours = 60 * 60;
      const collateralAmount = usdcBasis.mul(10);

      [firstPoolAmount] = await addLiquidityFromOffchain(firstLP, collateralAmount);

      await addLiquidityFrom(firstLP, collateralAmount);
      await setBlockTimestamp(now + 4 * hours);

      [secondPoolAmount] = await addLiquidityFromOffchain(secondLP, collateralAmount);
      await addLiquidityFrom(secondLP, collateralAmount);

      await setBlockTimestamp(now + 8 * hours);
      await removeLiquidityFrom(firstLP, firstPoolAmount);
      // set block timestamp to the next minutes.

      // set block timestamp to the next minutes.
      await setBlockTimestamp(now + 12 * hours);
      await removeLiquidityFrom(secondLP, secondPoolAmount);

      const firstAmount = await rewardsToken.balanceOf(firstLP.address);
      const secondAmount = await rewardsToken.balanceOf(secondLP.address);

      console.log(firstAmount.toString(), secondAmount.toString());
      const raito = firstAmount.mul(BONE).div(secondAmount);

      console.log(`raito = ${formatRatio(raito)}`);
    });
  });


  describe("add 100 usd, 1 LP join ", () => {
    let now: number;
    beforeEach(async () => {
      [firstLP, secondLP, thirdLP] = (await ethers.getSigners()).slice(1);
      now = Math.floor(Date.now() / 1000);
    });

    it("who join pool first should receive more reward", async () => {
      // join the market
      const hours = 60 * 60;
      const collateralAmount = usdcBasis.mul(100);

      await addLiquidityFrom(firstLP, collateralAmount);
      [secondPoolAmount] = await addLiquidityFromOffchain(secondLP, collateralAmount.mul(2));
      await addLiquidityFrom(secondLP, collateralAmount.mul(2));
   

      await setBlockTimestamp(now + 8 * hours);
      await addLiquidityFrom(firstLP, collateralAmount);
      await removeLiquidityFrom(secondLP, secondPoolAmount.div(2));
      // set block timestamp to the next minutes.

      // set block timestamp to the next minutes.
      await setBlockTimestamp(now + 16 * hours);

      firstPoolAmount = await masterChef.getUserAmount(0, firstLP.address);
      await removeLiquidityFrom(firstLP, firstPoolAmount);
      await removeLiquidityFrom(secondLP, secondPoolAmount.div(2));

      
      const firstAmount = await rewardsToken.balanceOf(firstLP.address);
      const secondAmount = await rewardsToken.balanceOf(secondLP.address);

      console.log(firstAmount.toString(), secondAmount.toString());
      const raito = firstAmount.mul(BONE).div(secondAmount);
      console.log(`raito = ${formatRatio(raito)}`);
    });
  });

  function formatRatio(ratio: BigNumber) {
    const beforeDec = ratio.div(BONE);
    let afterDec = ratio.mod(BONE).toString(); 
    while (afterDec.length < 18) afterDec = "0" + afterDec;
    return `${beforeDec}.${afterDec}`;
  }
});

function calcWeights(ratios: number[]): BigNumber[] {
  const basis = BigNumber.from(10).pow(18);
  const max = basis.mul(50);

  const total = ratios.reduce((total, x) => total + x, 0);
  const factor = max.div(total); // TODO this doesn't work if total is too large
  return ratios.map((r) => factor.mul(r));
}

