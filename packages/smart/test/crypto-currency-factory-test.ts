import { deployments, ethers, network } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { expect } from "chai";
import { BigNumber, BigNumberish } from "ethers";

import {
  AbstractMarketFactoryV2,
  AMMFactory,
  BPool__factory,
  Cash,
  CryptoCurrencyMarketFactoryV3,
  FeePot,
  CryptoCurrencyFetcher,
  FakePriceFeed,
  MasterChef,
  OwnedERC20__factory,
} from "../typechain";
import {
  calcShareFactor,
  fetchDynamicCryptoCurrency,
  fetchInitialCryptoCurrency,
  PRICE_FEEDS,
  NULL_ADDRESS,
  PRICE_FEEDS_BY_SYMBOL,
  priceFeed,
  RoundManagement,
  PriceFeed,
} from "../src";
import { calculateSellCompleteSetsWithValues } from "../src/bmath";
import { makePoolCheck, marketFactoryBundleCheck } from "./fetching";
import { randomPrice } from "../tasks";
import { createPoolStatusInfo } from "../src/fetcher/common";
import { Provider } from "@ethersproject/providers";

const MAX_APPROVAL = BigNumber.from(2).pow(256).sub(1);

describe("CryptoCurrencyFactory", function () {
  enum CoinIndex {
    None,
    BTC,
    ETH,
    // there are more but we aren't checking them
  }
  enum Outcome {
    Above,
    NotAbove,
  }

  let signer: SignerWithAddress;

  const now = BigNumber.from(Date.now()).div(1000);
  const firstResolutionTime = now.add(60 * 60 * 24); // normally would be Friday 4pm PST but just do a day in the future
  const cadence = 60 * 60 * 24 * 7; // one week
  let nextResolutionTime = BigNumber.from(0);
  let currentRound: RoundManagement;

  const usdcBasis = BigNumber.from(10).pow(6);

  let collateral: Cash;
  let feePot: FeePot;
  let shareFactor: BigNumber;
  let marketFactory: CryptoCurrencyMarketFactoryV3;
  let ammFactory: AMMFactory;
  let masterChef: MasterChef;
  let ethPriceMarketId: BigNumber;
  let btcPriceMarketId: BigNumber;
  let ethPriceFeed: FakePriceFeed;
  let btcPriceFeed: FakePriceFeed;
  let ethPrice: number;
  let btcPrice: number;

  before("signer", async () => {
    [signer] = await ethers.getSigners();
  });

  before("deploy", async () => {
    await deployments.fixture();
  });

  before("price feeds", async () => {
    currentRound = new RoundManagement(2, 50);
    ethPriceFeed = (await ethers.getContract(PRICE_FEEDS_BY_SYMBOL["ETH"].deploymentName)) as FakePriceFeed;
    btcPriceFeed = (await ethers.getContract(PRICE_FEEDS_BY_SYMBOL["BTC"].deploymentName)) as FakePriceFeed;
  });

  before("other contracts", async () => {
    marketFactory = (await ethers.getContract("CryptoCurrencyMarketFactoryV3")) as CryptoCurrencyMarketFactoryV3;
    collateral = (await ethers.getContract("Collateral")) as Cash;
    feePot = (await ethers.getContract("FeePot")) as FeePot;
    shareFactor = calcShareFactor(await collateral.decimals());
    ammFactory = (await ethers.getContract("AMMFactory")) as AMMFactory;
    masterChef = (await ethers.getContract("MasterChef")) as MasterChef;
  });

  it("is deployable", async () => {
    expect(await marketFactory.collateral()).to.equal(collateral.address);
    expect(await marketFactory.shareFactor()).to.equal(shareFactor);
    expect(await marketFactory.feePot()).to.equal(feePot.address);
  });

  it("Can add coins", async () => {
    const coins = await marketFactory.getCoins().then((coins) =>
      coins.map((coin) => ({
        name: coin.name,
        feed: coin.feed,
        value: coin.value,
        imprecision: coin.imprecision,
        currentMarket: coin.currentMarket,
      }))
    );

    // fake coin then each coin without markets or prices set
    expect(coins).to.deep.equal(
      await Promise.all([makePriceFeedCheck(priceFeed("", 0, 0))].concat(PRICE_FEEDS.map(makePriceFeedCheck)))
    );
  });

  it("no markets are created on setup", async () => {
    expect(await marketFactory.marketCount()).to.equal(1); // just the fake 0 index market
  });

  it("creates markets on first poke", async () => {
    nextResolutionTime = firstResolutionTime;
    ethPrice = 2400;
    btcPrice = 60000;
    await ethPriceFeed.addRound(currentRound.id, ethPrice * 1e8 - 1, 0, nextResolutionTime.sub(1), 0);
    await btcPriceFeed.addRound(currentRound.id, btcPrice * 1e8 - 1e7, 0, nextResolutionTime.sub(1), 0);
    // NOTE: this should take a gasLimit override because ganache mis-estimates but ganache also ignores the gasLimit override
    //       so instead hardhat.config.ts was edited to use a high limit
    await marketFactory.pokeCoin(CoinIndex.BTC, nextResolutionTime, 0);
    await marketFactory.pokeCoin(CoinIndex.ETH, nextResolutionTime, 0);
  });

  it("CoinAdded logs are correct", async () => {
    // Adding coins creates markets so no need to make such calls here. Just verify that they worked.

    const filter = marketFactory.filters.CoinAdded(null, null);
    const logs = await marketFactory.queryFilter(filter);
    expect(logs.length, "number of logs").to.equal(PRICE_FEEDS.length);
    const [btcLog, ethLog] = logs.map((log) => log.args);

    // NOTE: these are actually coin indexes but the first markets have the same indexes as their coins
    [ethPriceMarketId] = ethLog;
    [btcPriceMarketId] = btcLog;
    expect(btcPriceMarketId, "btc market id").to.equal(1);
    expect(ethPriceMarketId, "eth market id").to.equal(2);

    const { id: coinIndex, name } = btcLog;
    expect(coinIndex, "coinIndex").to.equal(CoinIndex.BTC);
    expect(name, "name").to.equal("BTC");
  });

  it("can index CoinAdded by coin", async () => {
    const filter = marketFactory.filters.CoinAdded(CoinIndex.ETH, null);
    const logs = await marketFactory.queryFilter(filter);
    expect(logs.length).to.equal(1);
    const [ethLog] = logs.map((log) => log.args);
    const [marketId] = ethLog;
    expect(marketId).to.equal(ethPriceMarketId);
  });

  it("BTC price market is correct", async () => {
    const market = await marketFactory.getMarket(btcPriceMarketId);
    const marketDetails = await marketFactory.getMarketDetails(btcPriceMarketId);
    const [above, notAbove] = market.shareTokens.map((addr) => OwnedERC20__factory.connect(addr, signer));

    expect(market.shareTokens.length, "shareTokens.length").to.equal(2);
    expect(market.winner, "winner").to.equal(NULL_ADDRESS);
    expect(marketDetails.coinIndex, "coinIndex").to.equal(CoinIndex.BTC);
    expect(marketDetails.creationValue, "creationValue").to.equal(btcPrice);
    expect(marketDetails.resolutionValue, "resolutionValue").to.equal(0);

    expect(await above.symbol(), "above.symbol").to.equal("Above");
    expect(await above.name(), "above.name").to.equal("Above");
    expect(await notAbove.symbol(), "notAbove.symbol").to.equal("Not Above");
    expect(await notAbove.name(), "notAbove.name").to.equal("Not Above");
  });

  it("ETH price market is correct", async () => {
    const market = await marketFactory.getMarket(ethPriceMarketId);
    const marketDetails = await marketFactory.getMarketDetails(ethPriceMarketId);
    const [above, notAbove] = market.shareTokens.map((addr) => OwnedERC20__factory.connect(addr, signer));

    expect(market.shareTokens.length).to.equal(2);
    expect(market.winner).to.equal(NULL_ADDRESS);
    expect(marketDetails.coinIndex).to.equal(CoinIndex.ETH);
    expect(marketDetails.creationValue).to.equal(ethPrice);
    expect(marketDetails.resolutionValue).to.equal(0);

    expect(await above.symbol()).to.equal("Above");
    expect(await above.name()).to.equal("Above");
    expect(await notAbove.symbol()).to.equal("Not Above");
    expect(await notAbove.name()).to.equal("Not Above");
  });

  it("can resolve and recreate markets", async () => {
    ethPrice = 2500;
    btcPrice = 55000;
    currentRound = currentRound.nextRound();
    await btcPriceFeed.addRound(currentRound.id, btcPrice * 1e8 - 2, 0, nextResolutionTime, 0);
    await ethPriceFeed.addRound(currentRound.id, ethPrice * 1e8 - 1e8 + 1, 0, nextResolutionTime, 0);
    await Promise.all(
      PRICE_FEEDS.slice(2).map(async (coin) => {
        const priceFeed = (await ethers.getContract(coin.deploymentName)) as FakePriceFeed;
        await priceFeed.addRound(currentRound.id, randomPrice(), 0, nextResolutionTime, 0);
      })
    );
    await network.provider.send("evm_setNextBlockTimestamp", [nextResolutionTime.toNumber()]);
    nextResolutionTime = nextResolutionTime.add(cadence);

    await marketFactory.pokeCoin(CoinIndex.BTC, nextResolutionTime, currentRound.id);
    await marketFactory.pokeCoin(CoinIndex.ETH, nextResolutionTime, currentRound.id);

    const ethPriceMarket = await marketFactory.getMarket(ethPriceMarketId);
    const ethPriceMarketDetails = await marketFactory.getMarketDetails(ethPriceMarketId);
    const btcPriceMarket = await marketFactory.getMarket(btcPriceMarketId);
    const btcPriceMarketDetails = await marketFactory.getMarketDetails(btcPriceMarketId);

    expect(ethPriceMarket.winner, "eth winner").to.equal(ethPriceMarket.shareTokens[Outcome.Above]);
    expect(ethPriceMarketDetails.resolutionValue, "eth resolution price").to.equal(249900000001);

    expect(btcPriceMarket.winner, "btc winner").to.equal(btcPriceMarket.shareTokens[Outcome.NotAbove]);
    expect(btcPriceMarketDetails.resolutionValue, "btc resolution price").to.equal(5499999999998);
  });

  it("NewPrice log, by resolution time", async () => {
    const filter = marketFactory.filters.ValueUpdate(null, nextResolutionTime, null, null);
    const logs = await marketFactory.queryFilter(filter);
    expect(logs.length).to.equal(2);
    const [log] = logs;

    expect(log); // TODO
  });

  it("new ETH price market is correct", async () => {
    ethPriceMarketId = BigNumber.from(4);
    const market = await marketFactory.getMarket(ethPriceMarketId);
    const marketDetails = await marketFactory.getMarketDetails(ethPriceMarketId);
    const [above, notAbove] = market.shareTokens.map((addr) => OwnedERC20__factory.connect(addr, signer));

    const ethCoin = await marketFactory.getCoin(CoinIndex.ETH);
    expect(ethCoin.currentMarket, "ethcoin market").to.equal(ethPriceMarketId);

    expect(market.winner, "winner").to.equal(NULL_ADDRESS);
    expect(marketDetails.coinIndex, "coinIndex").to.equal(CoinIndex.ETH);
    expect(marketDetails.creationValue, "creationValue").to.equal(ethPrice);
    expect(marketDetails.resolutionValue, "resolutionValue").to.equal(0);

    expect(await above.symbol()).to.equal("Above");
    expect(await above.name()).to.equal("Above");
    expect(await notAbove.symbol()).to.equal("Not Above");
    expect(await notAbove.name()).to.equal("Not Above");
  });

  it("can create pool", async () => {
    const initialLiquidity = usdcBasis.mul(1000); // 1000 of the collateral
    await collateral.faucet(initialLiquidity);
    await collateral.approve(ammFactory.address, initialLiquidity);

    await ammFactory.createPool(marketFactory.address, ethPriceMarketId, initialLiquidity, signer.address);
  });

  it("can buy shares", async () => {
    const collateralIn = usdcBasis.mul(10);
    await collateral.faucet(collateralIn);
    await collateral.approve(ammFactory.address, collateralIn);
    await ammFactory.buy(marketFactory.address, ethPriceMarketId, Outcome.Above, collateralIn, 0);
  });

  it("can sell shares", async () => {
    const setsInForCollateral = await marketFactory.calcShares(usdcBasis.mul(5));
    const [tokenAmountOut, shareTokensIn] = await calculateSellCompleteSetsWithValues(
      ammFactory,
      (marketFactory as unknown) as AbstractMarketFactoryV2,
      ethPriceMarketId.toString(),
      Outcome.Above,
      setsInForCollateral.toString()
    );

    await Promise.all(
      await marketFactory
        .getMarket(ethPriceMarketId)
        .then((market) => market.shareTokens)
        .then((addresses) => addresses.map((address) => OwnedERC20__factory.connect(address, signer)))
        .then((shareTokens) => shareTokens.map((shareToken) => shareToken.approve(ammFactory.address, MAX_APPROVAL)))
    );

    await ammFactory.sellForCollateral(
      marketFactory.address,
      ethPriceMarketId,
      Outcome.Above,
      shareTokensIn,
      tokenAmountOut
    );
  });

  it("can add liquidity", async () => {
    const collateralIn = usdcBasis.mul(10);
    await collateral.faucet(collateralIn);
    await collateral.approve(ammFactory.address, collateralIn);
    await ammFactory.addLiquidity(marketFactory.address, ethPriceMarketId, collateralIn, 0, signer.address);
  });

  it("can remove liquidity", async () => {
    const collateralIn = usdcBasis.mul(10);
    await collateral.faucet(collateralIn);
    await collateral.approve(ammFactory.address, collateralIn);
    const lpTokensIn = await ammFactory.getPoolTokenBalance(
      marketFactory.address,
      ethPriceMarketId.toString(),
      signer.address
    );
    const pool = await ammFactory
      .getPool(marketFactory.address, ethPriceMarketId)
      .then((address) => BPool__factory.connect(address, signer));
    await pool.approve(ammFactory.address, lpTokensIn);
    await ammFactory.removeLiquidity(marketFactory.address, ethPriceMarketId, lpTokensIn, 0, signer.address);
  });

  it("won't resolve if the given round isn't the earliest after resolutionTime", async () => {
    ethPrice = 2500;
    btcPrice = 55000;

    // Current state:
    // * nextResolutionTime is a day ahead of the current blocktime
    // * the current markets resolve at nextResolutionTime
    // * currentRound is the round of the current markets

    currentRound = currentRound.nextRound();
    await btcPriceFeed.addRound(currentRound.id, btcPrice * 1e8, 0, nextResolutionTime, 0);
    await ethPriceFeed.addRound(currentRound.id, ethPrice * 1e8, 0, nextResolutionTime, 0);

    // Current state:
    // * currentRound is 1 round ahead of the current markets

    currentRound = currentRound.nextRound();
    await btcPriceFeed.addRound(currentRound.id, btcPrice * 1e8, 0, nextResolutionTime.add(1), 0);
    await ethPriceFeed.addRound(currentRound.id, ethPrice * 1e8, 0, nextResolutionTime.add(1), 0);

    // Current state:
    // * currentRound is 2 rounds ahead of the current markets

    await network.provider.send("evm_setNextBlockTimestamp", [nextResolutionTime.toNumber()]);

    // Current state:
    // * nextResolutionTime is at the current block time
    // * the current markets resolve at nextResolutionTime

    nextResolutionTime = nextResolutionTime.add(cadence);

    // Current state:
    // * nextResolutionTime is a day ahead of the current blocktime
    // * the current markets resolve a day before nextResolutionTime

    await expect(
      marketFactory.pokeCoin(CoinIndex.ETH, nextResolutionTime, currentRound.id)
    ).to.eventually.be.rejectedWith(
      "VM Exception while processing transaction: reverted with reason string 'Must use first round after resolution time'"
    );
  });

  it("can resolve without creating", async () => {
    // Current state:
    // * nextResolutionTime is a day ahead of the current blocktime
    // * the current markets resolve a day before nextResolutionTime
    // * currentRound is 2 rounds ahead of the current markets

    expect(await marketFactory.marketCount(), "market count before final resolution").to.equal(5);

    // it's the final resolution because the nextResolutionTime is set to zero
    await marketFactory.pokeCoin(CoinIndex.BTC, 0, currentRound.prevRound().id);
    await marketFactory.pokeCoin(CoinIndex.ETH, 0, currentRound.prevRound().id);

    expect(await marketFactory.marketCount(), "market count after final resolution").to.equal(5);
  });

  it("can start up again after stopping", async () => {
    ethPrice = 2500;
    btcPrice = 55000;
    currentRound = currentRound.nextRound();
    await btcPriceFeed.addRound(currentRound.id, btcPrice * 1e8, 0, nextResolutionTime, 0);
    await ethPriceFeed.addRound(currentRound.id, ethPrice * 1e8, 0, nextResolutionTime, 0);

    await network.provider.send("evm_setNextBlockTimestamp", [nextResolutionTime.toNumber()]);

    await marketFactory.pokeCoin(CoinIndex.BTC, nextResolutionTime, currentRound.id);
    await marketFactory.pokeCoin(CoinIndex.ETH, nextResolutionTime, currentRound.id);

    expect(await marketFactory.marketCount(), "market count after resolution").to.equal(7);
  });

  let fetcher: CryptoCurrencyFetcher;

  it("fetcher deploys", async () => {
    fetcher = (await ethers.getContract("CryptoCurrencyFetcher")) as CryptoCurrencyFetcher;

    expect(await fetcher.marketType()).to.equal("CryptoCurrency");
    expect(await fetcher.version()).to.be.a("string");
  });

  [
    { offset: 0, bundle: 50, ids: [6, 5, 4] }, // open markets + market with winning shares
    { offset: 1, bundle: 50, ids: [5, 4] },
    { offset: 0, bundle: 1, ids: [6, 5, 4] },
    { offset: 2, bundle: 50, ids: [4] }, // skip all open markets
  ].forEach(({ offset, bundle, ids }) => {
    it(`fetcher initial {offset=${offset},bundle=${bundle}}`, async () => {
      const { factoryBundle, markets, timestamp } = await fetchInitialCryptoCurrency(
        fetcher,
        marketFactory,
        ammFactory,
        masterChef,
        offset,
        bundle
      );
      expect(factoryBundle, "factory bundle").to.deep.equal(await marketFactoryBundleCheck(marketFactory));

      expect(markets, "market bundles").to.deep.equal(
        await Promise.all(ids.map((id) => marketStaticBundleCheck(marketFactory, ammFactory, masterChef, id)))
      );

      expect(timestamp).to.deep.equal(
        BigNumber.from((await (signer.provider as Provider).getBlock("latest")).timestamp)
      );
    });

    it(`fetcher dynamic {offset=${offset},bundle=${bundle}}`, async () => {
      const { markets, timestamp } = await fetchDynamicCryptoCurrency(
        fetcher,
        marketFactory,
        ammFactory,
        offset,
        bundle
      );

      expect(markets, "market bundles").to.deep.equal(
        await Promise.all(ids.map((id) => marketDynamicBundleCheck(marketFactory, ammFactory, id)))
      );

      expect(timestamp).to.deep.equal(
        BigNumber.from((await (signer.provider as Provider).getBlock("latest")).timestamp)
      );
    });
  });
});

async function marketStaticBundleCheck(
  marketFactory: CryptoCurrencyMarketFactoryV3,
  ammFactory: AMMFactory,
  masterChef: MasterChef,
  marketId: BigNumberish
) {
  const market = await marketFactory.getMarket(marketId);
  const marketDetails = await marketFactory.getMarketDetails(marketId);
  const rewards = await masterChef.getPoolInfo(ammFactory.address, marketFactory.address, marketId);

  return {
    // for all market factories
    factory: marketFactory.address,
    marketId: BigNumber.from(marketId),
    pool: await makePoolCheck(ammFactory, marketFactory, marketId),
    shareTokens: market.shareTokens,
    creationTimestamp: market.creationTimestamp,
    winner: market.winner,
    initialOdds: market.initialOdds,
    rewards: createPoolStatusInfo(rewards),

    // for the crypto market factory
    coinIndex: marketDetails.coinIndex,
    creationValue: marketDetails.creationValue,
    resolutionValue: marketDetails.resolutionValue,
    resolutionTime: marketDetails.resolutionTime,
  };
}

async function marketDynamicBundleCheck(
  marketFactory: CryptoCurrencyMarketFactoryV3,
  ammFactory: AMMFactory,
  marketId: BigNumberish
) {
  const market = await marketFactory.getMarket(marketId);
  const marketDetails = await marketFactory.getMarketDetails(marketId);
  return {
    // for all market factories
    factory: marketFactory.address,
    marketId: BigNumber.from(marketId),
    pool: await makePoolCheck(ammFactory, marketFactory, marketId),
    winner: market.winner,

    // for the crypto market factory
    resolutionValue: marketDetails.resolutionValue,
  };
}

async function makePriceFeedCheck(coin: PriceFeed) {
  const contract = await ethers.getContractOrNull(coin.deploymentName);
  const feed = contract ? contract.address : NULL_ADDRESS;

  return {
    currentMarket: BigNumber.from(0),
    value: BigNumber.from(0),
    name: coin.symbol,
    imprecision: coin.imprecision,
    feed,
  };
}
