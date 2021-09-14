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

describe("MasterChef", () => {
  let BPool__factory: BPool__factory;

  let signer: SignerWithAddress;
  let firstLP: SignerWithAddress, secondLP: SignerWithAddress, thirdLP: SignerWithAddress;

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
  let bPool: Contract;

  let initialLiquidity: BigNumber;

  const REWARD = BONE.mul(100);
  const EARLY_REWARD = BONE.mul(100);

  beforeEach(async () => {
    await deployments.fixture();

    [signer] = await ethers.getSigners();

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
  });

  const addLiquidityFrom = async (_signer: SignerWithAddress, _collateralAmount: BigNumberish) => {
    await collateral.connect(_signer).faucet(_collateralAmount);
    await collateral.connect(_signer).approve(ammFactory.address, _collateralAmount);

    return await ammFactory
      .connect(_signer)
      .addLiquidity(marketFactory.address, marketId, _collateralAmount, ZERO, _signer.address);
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

  describe("#Complex reward script 1 - 2 days reward", () => {
    beforeEach(async () => {
      await masterChef.addRewards(marketFactory.address, REWARD, 2, 0);

      const description = "Who will win Wrestlemania III?";
      const odds = calcWeights([2, 49, 49]);
      await marketFactory.createMarket(signer.address, description, outcomeNames, odds);

      initialLiquidity = usdcBasis.mul(100); // 1000 of the collateral
      await collateral.faucet(initialLiquidity);
      await collateral.approve(ammFactory.address, initialLiquidity);
      await ammFactory.createPool(marketFactory.address, marketId, initialLiquidity, signer.address);

      const bPoolAddress = await ammFactory.getPool(marketFactory.address, marketId);
      bPool = BPool__factory.attach(bPoolAddress).connect(signer);
      await bPool.approve(ammFactory.address, MAX_APPROVAL);
    });

    it("Check total reward", async () => {
      const collateralAmount = usdcBasis.mul(100);
      [firstLP, secondLP] = (await ethers.getSigners()).slice(1);
      const now = Math.floor(Date.now() / 1000);
      const oneDay = 60 * 60 * 24;

      await addLiquidityFrom(firstLP, collateralAmount);

      await setBlockTimestamp(now + oneDay);

      await addLiquidityFrom(secondLP, collateralAmount.mul(2));

      await setBlockTimestamp(now + 3 * oneDay);

      await removeLiquidityFrom(firstLP, await masterChef.getUserAmount(0, firstLP.address));
      await removeLiquidityFrom(secondLP, await masterChef.getUserAmount(0, secondLP.address));
      await removeLiquidityFrom(signer, await masterChef.getUserAmount(0, signer.address));

      const firstLPReward = await rewardsToken.balanceOf(firstLP.address);
      const secondLPReward = await rewardsToken.balanceOf(secondLP.address);
      const creatorPoolReward = await rewardsToken.balanceOf(signer.address);

      const firstRewardRatio = firstLPReward.mul(BONE).div(REWARD); // 1 / 2 * 1/2 + 1/4 * 1/2;
      const secondRewardRatio = secondLPReward.mul(BONE).div(REWARD); // 1/2 * 1/2

      expect(firstRewardRatio).lte(BigNumber.from("375").mul(BONE).div(10));
      expect(secondRewardRatio).lte(BigNumber.from("25").mul(BONE).div(10));
      expect(firstLPReward.add(secondLPReward).add(creatorPoolReward)).lte(REWARD);
    });
  });

  describe("#Complex reward script 2 - 10 days reward", () => {
    beforeEach(async () => {
      await masterChef.addRewards(marketFactory.address, REWARD, 10, 0);

      const description = "Who will win Wrestlemania III?";
      const odds = calcWeights([2, 49, 49]);
      await marketFactory.createMarket(signer.address, description, outcomeNames, odds);

      initialLiquidity = usdcBasis.mul(100); // 1000 of the collateral
      await collateral.faucet(initialLiquidity);
      await collateral.approve(ammFactory.address, initialLiquidity);
      await ammFactory.createPool(marketFactory.address, marketId, initialLiquidity, signer.address);

      const bPoolAddress = await ammFactory.getPool(marketFactory.address, marketId);
      bPool = BPool__factory.attach(bPoolAddress).connect(signer);
      await bPool.approve(ammFactory.address, MAX_APPROVAL);
    });

    it("Complex script #1", async () => {
      const collateralAmount = usdcBasis.mul(100);
      [firstLP, secondLP] = (await ethers.getSigners()).slice(1);
      const now = Math.floor(Date.now() / 1000);
      const oneDay = 60 * 60 * 24;

      await addLiquidityFrom(firstLP, collateralAmount);

      await setBlockTimestamp(now + oneDay);

      await addLiquidityFrom(secondLP, collateralAmount.mul(2));

      await setBlockTimestamp(now + 11 * oneDay);

      console.log((await masterChef.getUserAmount(0, firstLP.address)).toString());
      console.log((await masterChef.getUserAmount(0, secondLP.address)).toString());

      await removeLiquidityFrom(firstLP, await masterChef.getUserAmount(0, firstLP.address));
      await removeLiquidityFrom(secondLP, await masterChef.getUserAmount(0, secondLP.address));
      await removeLiquidityFrom(signer, await masterChef.getUserAmount(0, signer.address));

      const firstLPReward = await rewardsToken.balanceOf(firstLP.address);
      const secondLPReward = await rewardsToken.balanceOf(secondLP.address);
      const creatorPoolReward = await rewardsToken.balanceOf(signer.address);

      console.log(firstLPReward.toString(), formatRatio(firstLPReward.mul(BONE).div(REWARD))); // (1/2*1/10 + 1/4  * 9 / 10) * Reward
      console.log(secondLPReward.toString(), formatRatio(secondLPReward.mul(BONE).div(REWARD))); // 1/2 * 9/10

      const firstRewardRatio = firstLPReward.mul(BONE).div(REWARD);
      const secondRewardRatio = secondLPReward.mul(BONE).div(REWARD);

      expect(firstRewardRatio).lte(BigNumber.from("275").mul(BONE).div(10));
      expect(secondRewardRatio).lte(BigNumber.from("45").mul(BONE).div(10));

      expect(firstLPReward.add(secondLPReward).add(creatorPoolReward)).lte(REWARD);
    });
  });

  describe("#Check early reward ", () => {
    beforeEach(async () => {
      await masterChef.addRewards(marketFactory.address, REWARD, 10, REWARD);

      const description = "Who will win Wrestlemania III?";
      const odds = calcWeights([2, 49, 49]);
      await marketFactory.createMarket(signer.address, description, outcomeNames, odds);

      initialLiquidity = usdcBasis.mul(100); // 1000 of the collateral
      await collateral.faucet(initialLiquidity);
      await collateral.approve(ammFactory.address, initialLiquidity);
      await ammFactory.createPool(marketFactory.address, marketId, initialLiquidity, signer.address);

      const bPoolAddress = await ammFactory.getPool(marketFactory.address, marketId);
      bPool = BPool__factory.attach(bPoolAddress).connect(signer);
      await bPool.approve(ammFactory.address, MAX_APPROVAL);
    });

    it("Early reward", async () => {
      const collateralAmount = usdcBasis.mul(100);
      [firstLP, secondLP] = (await ethers.getSigners()).slice(1);
      const now = Math.floor(Date.now() / 1000);
      const oneDay = 60 * 60 * 24;

      await addLiquidityFrom(firstLP, collateralAmount);

      await setBlockTimestamp(now + 2 * oneDay);

      await addLiquidityFrom(firstLP, collateralAmount.mul(5));

      await setBlockTimestamp(now + oneDay * 11);

      await removeLiquidityFrom(firstLP, await masterChef.getUserAmount(0, firstLP.address));
      const firstLPReward = await rewardsToken.balanceOf(firstLP.address);

      console.log(firstLPReward.toString(), formatRatio(firstLPReward.mul(BONE).div(REWARD))); // 1/2 * 2/10 + 3/4 * 8/10

      expect(firstLPReward).lte(REWARD.add(EARLY_REWARD));
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
