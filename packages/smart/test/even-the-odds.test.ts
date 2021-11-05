import { deployments, ethers } from "hardhat";
import { AMMFactory, BPool, BPool__factory, Cash, EvenTheOdds, NFLMarketFactoryV3 } from "../typechain";
import { BigNumber } from "ethers";
import { expect } from "chai";

type Awaited<T> = T extends PromiseLike<infer U> ? U : T;
type DeRecord<T> = T extends Record<string, infer U> ? U : T;
type SignerWithAddress = DeRecord<Awaited<ReturnType<typeof ethers.getNamedSigners>>>;

describe("EvenTheOdds", () => {
  let ammFactory: AMMFactory;
  let bPool: BPool;
  let bPoolFactory: BPool__factory;
  let collateral: Cash;
  let contract: EvenTheOdds;
  let marketFactory: NFLMarketFactoryV3;

  let marketId: BigNumber;

  let deployer: SignerWithAddress;
  let plebeian: SignerWithAddress;

  const eventId = 9001;
  const homeTeamId = 42;
  const awayTeamId = 1881;
  const homeTeamName = "hom";
  const awayTeamName = "awa";
  const moneylines: [number, number] = [-130, +270]; // [home,away]
  const homeSpread = 20;
  const overUnderTotal = 60;

  const now = BigNumber.from(Date.now()).div(1000);
  const estimatedStartTime = now.add(60 * 60 * 24); // one day

  const usdcBasis = BigNumber.from(10).pow(6);
  const BONE = BigNumber.from(10).pow(18);
  const initialLiquidity = usdcBasis.mul(200); // 200 of the collateral

  beforeEach(async () => {
    await deployments.fixture();

    ({ deployer, plebeian } = await ethers.getNamedSigners());

    ammFactory = (await ethers.getContract("AMMFactory")) as AMMFactory;
    bPoolFactory = (await ethers.getContractFactory("BPool")) as BPool__factory;
    marketFactory = (await ethers.getContract("NFLMarketFactoryV3")) as NFLMarketFactoryV3;

    contract = (await ethers.getContract("EvenTheOdds")) as EvenTheOdds;
  });

  describe("when the bpool odds are far out of whack", () => {
    beforeEach(async () => {
      collateral = (await ethers.getContract("Collateral")) as Cash;
      await collateral.faucet(initialLiquidity.mul(2));
      await collateral.approve(ammFactory.address, initialLiquidity.mul(2));

      await marketFactory.createEvent(
        eventId,
        homeTeamName,
        homeTeamId,
        awayTeamName,
        awayTeamId,
        estimatedStartTime,
        homeSpread,
        overUnderTotal,
        moneylines
      );

      // Doesn't really matter which market we are dealing with. We just need one that actually exists.
      const filter = marketFactory.filters.MarketCreated(null, null, null);
      marketId =
        (await marketFactory.queryFilter(filter))
          .map((log) => log.args)
          .map((e) => e[0])
          .pop() || BigNumber.from(0);

      await ammFactory.createPool(marketFactory.address, marketId, initialLiquidity, deployer.address);

      bPool = bPoolFactory.attach(await ammFactory.pools(marketFactory.address, marketId));
      const lpTokenBalance = await bPool.balanceOf(deployer.address);

      await bPool.exitPool(lpTokenBalance.sub(BONE), [0, 0, 0]);

      await ammFactory.buy(marketFactory.address, marketId, 1, usdcBasis.div(8), 0);
      await ammFactory.buy(marketFactory.address, marketId, 0, usdcBasis.div(2), 0);
      await ammFactory.buy(marketFactory.address, marketId, 0, usdcBasis.div(2), 0);
      await ammFactory.buy(marketFactory.address, marketId, 0, usdcBasis.div(2), 0);
    });

    it("should undo bring pool token balances into parity", async () => {
      const amount = usdcBasis.mul(5);

      await collateral.faucet(amount);
      await collateral.approve(contract.address, amount);

      await contract.bringTokenBalanceToMatchOtherToken(marketFactory.address, marketId, bPool.address, 2, amount);

      const [tokenBalance0, tokenBalance1, tokenBalance2] = await getTokenBalances(bPool);
      expect(tokenBalance0.eq(tokenBalance2)).to.be.true;
      expect(tokenBalance1.eq(tokenBalance2)).to.be.true;

      // @todo check that shares/collateral was sent back.
    });
  });
});

async function getTokenBalances(bPool: BPool): Promise<BigNumber[]> {
  const tokens = await bPool.getCurrentTokens();
  const balances = [];
  for (const token of tokens) {
    balances.push(await bPool.getBalance(token));
  }

  return balances;
}
