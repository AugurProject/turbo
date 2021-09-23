import { deployments, ethers, network } from "hardhat";

import { Cash, MasterChef } from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { BigNumber } from "ethers";

import { expect } from "chai";

function adjustTimestamp(beginTimestamp: BigNumber, poolEndTimestamp: BigNumber, percentage: number) {
  return poolEndTimestamp.sub(beginTimestamp).mul(percentage).div(100).add(beginTimestamp).add(1).toNumber();
}
const BONE = BigNumber.from(10).pow(18);

// waffle offers a similar functionality but the types aren't correct :(
function checkWithin(actual: BigNumber, expected: BigNumber, tolerance = BONE) {
  const delta: BigNumber = expected.sub(actual).abs();

  if (delta.sub(tolerance).gte(0)) {
    expect.fail(`Value ${actual.toString()} is not within ${tolerance.toString()} of ${expected.toString()}`);
  }
}

describe("MasterChef", () => {
  let bill: SignerWithAddress;
  let tom: SignerWithAddress;
  let chwy: SignerWithAddress;

  let cash: Cash;
  let rewardsToken: Cash;
  let masterChef: MasterChef;
  let tomMasterChef: MasterChef;

  let poolEndTimestamp: BigNumber;
  let beginTimestamp: BigNumber;

  const ZERO = BigNumber.from(0);
  const SECONDS_PER_DAY = BigNumber.from(60).mul(60).mul(24);

  const RANDOM_ADDRESS = "0x0000000000000000000000000000000000000001";

  // 5 days.
  const rewardPeriods = BigNumber.from(5);

  // At the completion of the reward period we should give out 475 rewards if available on contract.
  const rewardsPerPeriod = BONE.mul(95);

  const totalRewards = rewardsPerPeriod.mul(rewardPeriods);
  const faucetedRewards = totalRewards.mul(100);

  const initialCashAmount = BONE.mul(100);

  const SECONDS_IN_AN_HOUR = BigNumber.from(60).mul(60);

  beforeEach(async () => {
    await deployments.fixture();
    cash = (await ethers.getContract("Collateral")) as Cash;
    rewardsToken = (await ethers.getContract("WrappedMatic")) as Cash;
    masterChef = (await ethers.getContract("MasterChef")) as MasterChef;

    [bill, chwy, tom] = await ethers.getSigners();

    tomMasterChef = masterChef.connect(tom);

    await masterChef.trustAMMFactory(RANDOM_ADDRESS);

    await masterChef.addRewards(bill.address, BigNumber.from(2), BONE.mul(95), ZERO);

    // Pull the rewards added during deployment on test nets.
    await masterChef.withdrawRewards(await rewardsToken.balanceOf(masterChef.address));

    await rewardsToken.faucet(faucetedRewards);
    await rewardsToken.transfer(masterChef.address, faucetedRewards);

    await cash.connect(tom).faucet(initialCashAmount);
    await cash.connect(tom).approve(masterChef.address, initialCashAmount);
  });

  describe("estimated start time (EST) to end rewards", () => {
    beforeEach(async () => {
      await masterChef.addRewards(bill.address, rewardsPerPeriod, rewardPeriods, ZERO);
    });

    it("should have zero rewards if EST has elapsed ", async () => {
      const { timestamp } = await ethers.provider.getBlock("latest");

      const estimatedStartTimeJustBeforeNow = BigNumber.from(timestamp).sub(100);
      await masterChef.add(RANDOM_ADDRESS, bill.address, 0, cash.address, estimatedStartTimeJustBeforeNow);

      const { beginTimestamp, endTimestamp } = await masterChef.poolInfo(0);
      expect(beginTimestamp.lte(endTimestamp)).to.be.true;
      expect(endTimestamp).to.be.equal(estimatedStartTimeJustBeforeNow.sub(SECONDS_IN_AN_HOUR));
    });

    it("should wait to begin rewards if EST is in the future more than rewardPeriods days", async () => {
      const { timestamp } = await ethers.provider.getBlock("latest");

      const estimatedStartTimeOneDayOutsideWindow = rewardPeriods.add(1).mul(SECONDS_PER_DAY).add(timestamp);
      await masterChef.add(RANDOM_ADDRESS, bill.address, 0, cash.address, estimatedStartTimeOneDayOutsideWindow);

      const { beginTimestamp, rewardsPerSecond } = await masterChef.poolInfo(0);
      // Should have an hour buffer.
      expect(beginTimestamp.sub(timestamp)).to.be.equal(SECONDS_PER_DAY.sub(SECONDS_IN_AN_HOUR));
      expect(rewardsPerSecond).to.be.equal(rewardsPerPeriod.div(SECONDS_PER_DAY));
    });
  });

  describe("Early bonus", () => {
    beforeEach(async () => {
      // Zero standard rewards is the difference here.
      await masterChef.addRewards(bill.address, ZERO, rewardPeriods, rewardsPerPeriod);
      await masterChef.add(RANDOM_ADDRESS, bill.address, ZERO, cash.address, 0);

      poolEndTimestamp = await masterChef.getPoolRewardEndTimestamp(0);

      const data = await masterChef.poolInfo(0);
      beginTimestamp = data.beginTimestamp;
    });

    it("should pay if deposited and left for duration of the reward pool's lifespan", async () => {
      await tomMasterChef.deposit(0, initialCashAmount);

      await network.provider.send("evm_setNextBlockTimestamp", [poolEndTimestamp.add(1).toNumber()]);
      await network.provider.send("evm_mine", []);

      const pendingRewardsInfo = await masterChef.getUserPendingRewardInfo(
        RANDOM_ADDRESS,
        bill.address,
        0,
        tom.address
      );
      expect(pendingRewardsInfo.accruedStandardRewards).to.be.equal(0);
      checkWithin(pendingRewardsInfo.accruedEarlyDepositBonusRewards, totalRewards);

      await tomMasterChef.withdraw(0, initialCashAmount);

      checkWithin(await rewardsToken.balanceOf(tom.address), totalRewards);
    });

    it("should not pay if a deposit is made after the bonus period has elapsed", async () => {
      const timestampAfterBonusRewards = adjustTimestamp(beginTimestamp, poolEndTimestamp, 15);

      await network.provider.send("evm_setNextBlockTimestamp", [timestampAfterBonusRewards]);
      await network.provider.send("evm_mine", []);

      await tomMasterChef.deposit(0, initialCashAmount.div(2));

      const pendingRewardsInfoBeforeRewardEnd = await masterChef.getUserPendingRewardInfo(
        RANDOM_ADDRESS,
        bill.address,
        0,
        tom.address
      );

      expect(pendingRewardsInfoBeforeRewardEnd.accruedStandardRewards).to.be.equal(0);
      expect(pendingRewardsInfoBeforeRewardEnd.accruedEarlyDepositBonusRewards).to.be.equal(0);
      expect(pendingRewardsInfoBeforeRewardEnd.pendingEarlyDepositBonusRewards).to.be.equal(0);

      await tomMasterChef.deposit(0, initialCashAmount.div(2));

      await network.provider.send("evm_setNextBlockTimestamp", [poolEndTimestamp.toNumber()]);
      await network.provider.send("evm_mine", []);

      const pendingRewardsInfoAfterRewardEnd = await masterChef.getUserPendingRewardInfo(
        RANDOM_ADDRESS,
        bill.address,
        0,
        tom.address
      );

      expect(pendingRewardsInfoAfterRewardEnd.accruedStandardRewards).to.be.equal(0);
      expect(pendingRewardsInfoAfterRewardEnd.accruedEarlyDepositBonusRewards).to.be.equal(0);
      expect(pendingRewardsInfoAfterRewardEnd.pendingEarlyDepositBonusRewards).to.be.equal(0);

      await tomMasterChef.withdraw(0, initialCashAmount);

      expect(await rewardsToken.balanceOf(tom.address)).to.be.equal(0);
    });

    describe("double withdrawal", () => {
      it("should return early bonus", async () => {
        await tomMasterChef.deposit(0, initialCashAmount);

        await network.provider.send("evm_setNextBlockTimestamp", [poolEndTimestamp.toNumber()]);
        await network.provider.send("evm_mine", []);

        await tomMasterChef.withdraw(0, initialCashAmount.div(2));
        checkWithin(await rewardsToken.balanceOf(tom.address), totalRewards);

        await tomMasterChef.withdraw(0, initialCashAmount.div(2));
        checkWithin(await rewardsToken.balanceOf(tom.address), totalRewards);
      });
    });
  });

  describe("No rewards", () => {
    beforeEach(async () => {
      await masterChef.addRewards(bill.address, ZERO, ZERO, ZERO);
      await masterChef.add(RANDOM_ADDRESS, cash.address, ZERO, cash.address, 0);

      poolEndTimestamp = await masterChef.getPoolRewardEndTimestamp(0);

      const data = await masterChef.poolInfo(0);
      beginTimestamp = data.beginTimestamp;
    });

    it("should not distribute any rewards", async () => {
      await tomMasterChef.deposit(0, initialCashAmount);

      const poolEndTimestamp = await masterChef.getPoolRewardEndTimestamp(0);

      await network.provider.send("evm_setNextBlockTimestamp", [poolEndTimestamp.add(100000).toNumber()]);
      await network.provider.send("evm_mine", []);

      const otherAmount = await masterChef.getUserPendingRewardInfo(RANDOM_ADDRESS, bill.address, 0, tom.address);
      expect(otherAmount.accruedEarlyDepositBonusRewards).to.be.equal(0);
      expect(otherAmount.accruedStandardRewards).to.be.equal(0);

      // it distributes all the pending rewards.
      expect(await rewardsToken.balanceOf(tom.address)).to.be.equal(0);
    });
  });

  describe("Standard rewards", () => {
    beforeEach(async () => {
      await masterChef.addRewards(bill.address, rewardsPerPeriod, rewardPeriods, 0);
      await masterChef.add(RANDOM_ADDRESS, bill.address, ZERO, cash.address, 0);

      poolEndTimestamp = await masterChef.getPoolRewardEndTimestamp(0);

      const data = await masterChef.poolInfo(0);
      beginTimestamp = data.beginTimestamp;
    });

    it("should have a reasonable timestamp", async () => {
      expect(poolEndTimestamp.lt(rewardPeriods.mul(24).mul(3600)));
      expect(poolEndTimestamp.lt(rewardPeriods.mul(24).mul(3600).add(100)));
    });

    it("should calculate rewardsPerSecond correctly", async () => {
      const { rewardsPerSecond } = await masterChef.poolInfo(0);
      expect(rewardsPerSecond).to.be.equal(rewardsPerPeriod.div(SECONDS_PER_DAY));
    });

    describe("active pool", () => {
      describe("entry at beginning of pool", () => {
        describe("pool info", () => {
          beforeEach(async () => {
            await tomMasterChef.deposit(0, initialCashAmount);
          });

          it("should calculate correctly 25%", async () => {
            const newTimestamp = adjustTimestamp(beginTimestamp, poolEndTimestamp, 25);

            await network.provider.send("evm_setNextBlockTimestamp", [newTimestamp]);

            await masterChef.updatePool(0);

            const { accRewardsPerShare } = await masterChef.poolInfo(0);
            checkWithin(accRewardsPerShare, totalRewards.div(4).mul(BONE).div(initialCashAmount));
          });

          it("should calculate correctly 50%", async () => {
            const newTimestamp = adjustTimestamp(beginTimestamp, poolEndTimestamp, 50);

            await network.provider.send("evm_setNextBlockTimestamp", [newTimestamp]);

            await masterChef.updatePool(0);

            const { accRewardsPerShare } = await masterChef.poolInfo(0);
            checkWithin(accRewardsPerShare, totalRewards.div(2).mul(BONE).div(initialCashAmount));
          });

          it("should calculate correctly 100%", async () => {
            const newTimestamp = adjustTimestamp(beginTimestamp, poolEndTimestamp, 100);

            await network.provider.send("evm_setNextBlockTimestamp", [newTimestamp]);

            await masterChef.updatePool(0);

            const { accRewardsPerShare } = await masterChef.poolInfo(0);
            checkWithin(accRewardsPerShare, totalRewards.div(1).mul(BONE).div(initialCashAmount));
          });
        });

        describe("pending rewards", () => {
          beforeEach(async () => {
            await tomMasterChef.deposit(0, initialCashAmount);
          });

          it("should calculate correctly 25%", async () => {
            const newTimestamp = adjustTimestamp(beginTimestamp, poolEndTimestamp, 25);

            await network.provider.send("evm_setNextBlockTimestamp", [newTimestamp]);
            await network.provider.send("evm_mine", []);

            const { accruedStandardRewards } = await masterChef.getUserPendingRewardInfo(
              RANDOM_ADDRESS,
              bill.address,
              0,
              tom.address
            );
            checkWithin(accruedStandardRewards, totalRewards.div(4));
          });

          it("should calculate correctly 50%", async () => {
            const newTimestamp = adjustTimestamp(beginTimestamp, poolEndTimestamp, 50);

            await network.provider.send("evm_setNextBlockTimestamp", [newTimestamp]);
            await network.provider.send("evm_mine", []);

            const { accruedStandardRewards } = await masterChef.getUserPendingRewardInfo(
              RANDOM_ADDRESS,
              bill.address,
              0,
              tom.address
            );
            checkWithin(accruedStandardRewards, totalRewards.div(2));
          });

          it("should calculate correctly 100%", async () => {
            const newTimestamp = adjustTimestamp(beginTimestamp, poolEndTimestamp, 100);

            await network.provider.send("evm_setNextBlockTimestamp", [newTimestamp]);
            await network.provider.send("evm_mine", []);

            const { accruedStandardRewards } = await masterChef.getUserPendingRewardInfo(
              RANDOM_ADDRESS,
              bill.address,
              0,
              tom.address
            );
            checkWithin(accruedStandardRewards, totalRewards.div(1));
          });
        });

        describe("partial removal", () => {
          it("should withdraw all the rewards", async () => {
            const halfwayPoint = adjustTimestamp(beginTimestamp, poolEndTimestamp, 50);

            await tomMasterChef.deposit(0, initialCashAmount);

            await network.provider.send("evm_setNextBlockTimestamp", [halfwayPoint]);

            // it distributes all the pending rewards.
            await tomMasterChef.withdraw(0, initialCashAmount.div(2));
            const tokenBalance = await rewardsToken.balanceOf(tom.address);
            checkWithin(tokenBalance, totalRewards.div(2));

            await network.provider.send("evm_setNextBlockTimestamp", [poolEndTimestamp.toNumber()]);

            await tomMasterChef.withdraw(0, initialCashAmount.div(2));
            const secondTokenBalance = await rewardsToken.balanceOf(tom.address);
            checkWithin(secondTokenBalance, totalRewards);
          });
        });

        describe("stake twice", () => {
          it("should not overflow", async () => {
            // Depositing twice was causing this issue.
            await tomMasterChef.deposit(0, initialCashAmount.div(2));
            await tomMasterChef.deposit(0, initialCashAmount.div(2));

            await network.provider.send("evm_setNextBlockTimestamp", [
              adjustTimestamp(beginTimestamp, poolEndTimestamp, 25),
            ]);
            await tomMasterChef.withdraw(0, initialCashAmount.div(4));

            // it distributes all the pending rewards.
            const balance = await rewardsToken.balanceOf(tom.address);
            expect(totalRewards.div(4).sub(balance)).to.be.lte(100);

            await network.provider.send("evm_setNextBlockTimestamp", [poolEndTimestamp.toNumber()]);
            await tomMasterChef.withdraw(0, initialCashAmount.div(2));
          });
        });
      });
    });

    describe("after end of pool rewards", () => {
      beforeEach(async () => {
        await tomMasterChef.deposit(0, initialCashAmount);

        const poolEndTimestamp = await masterChef.getPoolRewardEndTimestamp(0);

        await network.provider.send("evm_mine", []);
        await network.provider.send("evm_setNextBlockTimestamp", [poolEndTimestamp.add(100000).toNumber()]);
        await network.provider.send("evm_mine", []);
      });

      it("should calculate pending payout rewards", async () => {
        const results = await masterChef.getTimeElapsed(0);
        expect(results).to.be.equal(poolEndTimestamp.sub(beginTimestamp).mul(BONE));

        const pendingRewardInfo = await masterChef.getUserPendingRewardInfo(
          RANDOM_ADDRESS,
          bill.address,
          0,
          tom.address
        );

        expect(pendingRewardInfo.accruedEarlyDepositBonusRewards).to.be.equal(0);
        checkWithin(pendingRewardInfo.accruedStandardRewards, totalRewards);
      });

      it("should not payout rewards to user that enter after rewards end", async () => {
        await cash.connect(chwy).faucet(initialCashAmount);
        await cash.connect(chwy).approve(masterChef.address, initialCashAmount);

        checkWithin(await rewardsToken.balanceOf(chwy.address), ZERO);

        await masterChef.connect(chwy).deposit(0, initialCashAmount);
        await masterChef.connect(chwy).withdraw(0, initialCashAmount);

        checkWithin(await rewardsToken.balanceOf(chwy.address), ZERO);

        await tomMasterChef.withdraw(0, initialCashAmount);

        checkWithin(await rewardsToken.balanceOf(tom.address), totalRewards);
      });

      it("should send rewards on withdrawal", async () => {
        await tomMasterChef.withdraw(0, initialCashAmount);

        const balance = await rewardsToken.balanceOf(tom.address);
        checkWithin(balance, totalRewards);
      });

      it("should only payout what is available on contract", async () => {
        await masterChef.withdrawRewards(faucetedRewards);

        await rewardsToken.transfer(masterChef.address, rewardsPerPeriod.div(2));

        await tomMasterChef.withdraw(0, initialCashAmount);

        const balance = await rewardsToken.balanceOf(tom.address);
        expect(balance).to.be.equal(rewardsPerPeriod.div(2));
      });
    });
  });
});
