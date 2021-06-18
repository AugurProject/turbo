import { ethers, network } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { expect } from "chai";
import { smockit } from "@eth-optimism/smock";
import { BigNumber, BigNumberish } from "ethers";

import {
  Cash,
  Cash__factory,
  FeePot__factory,
  OwnedERC20__factory,
  CryptoMarketFactory__factory,
  CryptoMarketFactory,
  AggregatorV3Interface,
  AMMFactory,
  FeePot,
  AMMFactory__factory,
  BFactory__factory,
  AbstractMarketFactory,
  BPool__factory,
} from "../typechain";
import feedABI from "../abi/@chainlink/contracts/src/v0.7/interfaces/AggregatorV3Interface.sol/AggregatorV3Interface.json";
import { calcShareFactor, CryptoMarketType, NULL_ADDRESS } from "../src";
import { calculateSellCompleteSetsWithValues } from "../src/bmath";

const MAX_APPROVAL = BigNumber.from(2).pow(256).sub(1);

describe.only("CryptoFactory", () => {
  enum CoinIndex {
    None,
    ETH,
    BTC,
  }
  enum PriceUpDownOutcome {
    Above,
    NotAbove,
  }

  let signer: SignerWithAddress;

  const now = BigNumber.from(Date.now()).div(1000);
  const firstResolutionTime = now.add(60 * 60 * 24); // normally would be Friday 4pm PST but just do a day in the future
  const cadence = 60 * 60 * 24 * 7; // one week
  let nextResolutionTime = firstResolutionTime;

  const smallFee = BigNumber.from(10).pow(16);
  const usdcBasis = BigNumber.from(10).pow(6);

  let collateral: Cash;
  let reputationToken: Cash;
  let feePot: FeePot;
  let shareFactor: BigNumber;
  let marketFactory: CryptoMarketFactory;
  let ammFactory: AMMFactory;
  let ethPriceMarketId: BigNumber;
  let btcPriceMarketId: BigNumber;
  let ethPriceFeed: AggregatorV3Interface;
  let btcPriceFeed: AggregatorV3Interface;
  let ethPrice: number;
  let btcPrice: number;

  before("signer", async () => {
    [signer] = await ethers.getSigners();
  });

  before("price feeds", async () => {
    ethPriceFeed = await smockit(feedABI);
    btcPriceFeed = await smockit(feedABI);

    ethPriceFeed.smocked.decimals.will.return.with(8);
    btcPriceFeed.smocked.decimals.will.return.with(8);
  });

  before("other contracts", async () => {
    collateral = await new Cash__factory(signer).deploy("USDC", "USDC", 6); // 6 decimals to mimic USDC
    reputationToken = await new Cash__factory(signer).deploy("REPv2", "REPv2", 18);
    feePot = await new FeePot__factory(signer).deploy(collateral.address, reputationToken.address);
    shareFactor = calcShareFactor(await collateral.decimals());
    const bFactory = await new BFactory__factory(signer).deploy();
    ammFactory = await new AMMFactory__factory(signer).deploy(bFactory.address, smallFee);
  });

  it("is deployable", async () => {
    const owner = signer.address;
    const protocol = signer.address;
    const linkNode = signer.address;
    const stakerFee = smallFee;
    const settlementFee = smallFee;
    const protocolFee = smallFee;
    marketFactory = await new CryptoMarketFactory__factory(signer).deploy(
      owner,
      collateral.address,
      shareFactor,
      feePot.address,
      stakerFee,
      settlementFee,
      protocol,
      protocolFee,
      linkNode,
      firstResolutionTime
    );

    expect(await marketFactory.getOwner()).to.equal(owner);
    expect(await marketFactory.collateral()).to.equal(collateral.address);
    expect(await marketFactory.shareFactor()).to.equal(shareFactor);
    expect(await marketFactory.feePot()).to.equal(feePot.address);
    expect(await marketFactory.stakerFee()).to.equal(stakerFee);
    expect(await marketFactory.settlementFee()).to.equal(settlementFee);
    expect(await marketFactory.protocol()).to.equal(protocol);
    expect(await marketFactory.protocolFee()).to.equal(protocolFee);
    expect(await marketFactory.linkNode()).to.equal(linkNode);
    expect(await marketFactory.nextResolutionTime()).to.equal(nextResolutionTime);
  });

  it("Can add a coin, which creates a market", async () => {
    ethPrice = 2400;
    ethPriceFeed.smocked.latestRoundData.will.return.with([1, ethPrice * 1e8, 1, 1, 1]);
    await marketFactory.addCoin("ETH", ethPriceFeed.address, 0);
  });

  it("Can add a second coin, which creates another market", async () => {
    btcPrice = 60000;
    btcPriceFeed.smocked.latestRoundData.will.return.with([1, btcPrice * 1e8, 1, 1, 1]);
    await marketFactory.addCoin("BTC", btcPriceFeed.address, 0);
  });

  it("MarketCreated logs are correct", async () => {
    // Adding coins creates markets so no need to make such calls here. Just verify that they worked.

    const filter = marketFactory.filters.MarketCreated(null, null, null, null, null, null);
    const logs = await marketFactory.queryFilter(filter);
    expect(logs.length, "number of logs").to.equal(2);
    const [ethLog, btcLog] = logs.map((log) => log.args);

    [ethPriceMarketId] = ethLog;
    [btcPriceMarketId] = btcLog;

    expect(ethPriceMarketId, "eth market id").to.equal(1);
    expect(btcPriceMarketId, "btc market id").to.equal(2);

    const { creator, endTime, marketType, coinIndex, price } = ethLog;
    expect(creator, "creator").to.equal(signer.address);
    expect(endTime, "endTime").to.equal(nextResolutionTime);
    expect(marketType, "marketType").to.equal(CryptoMarketType.PriceUpTo);
    expect(coinIndex, "coinIndex").to.equal(CoinIndex.ETH);
    expect(price, "price").to.equal(ethPrice);
  });

  it("can index MarketCreated by coin", async () => {
    const filter = marketFactory.filters.MarketCreated(null, null, null, null, CoinIndex.ETH, null);
    const logs = await marketFactory.queryFilter(filter);
    expect(logs.length).to.equal(1);
    const [ethLog] = logs.map((log) => log.args);
    const [marketId] = ethLog;
    expect(marketId).to.equal(ethPriceMarketId);
  });

  it("can index MarketCreated by resolution time", async () => {
    const filter = marketFactory.filters.MarketCreated(null, null, nextResolutionTime, null, null, null);
    const logs = await marketFactory.queryFilter(filter);
    expect(logs.length).to.equal(2);
  });

  it("Coins data structure is correct", async () => {
    const ethCoin = await marketFactory.getCoin(CoinIndex.ETH);
    const btcCoin = await marketFactory.getCoin(CoinIndex.BTC);
    const coins = await marketFactory.getCoins();

    expect(coins.length).to.equal(3);
    expect(JSON.stringify(coins[CoinIndex.ETH])).to.equal(JSON.stringify(ethCoin));
    expect(JSON.stringify(coins[CoinIndex.BTC])).to.equal(JSON.stringify(btcCoin));

    expect(ethCoin.name).to.equal("ETH");
    expect(ethCoin.price.toNumber()).to.equal(ethPrice);
    expect(ethCoin.priceFeed).to.equal(ethPriceFeed.address);
    expect(ethCoin.currentMarkets.length).to.equal(1);
    expect(ethCoin.currentMarkets[0].toNumber()).to.equal(ethPriceMarketId);

    expect(btcCoin.name).to.equal("BTC");
    expect(btcCoin.price.toNumber()).to.equal(btcPrice);
    expect(btcCoin.priceFeed).to.equal(btcPriceFeed.address);
    expect(btcCoin.currentMarkets.length).to.equal(1);
    expect(btcCoin.currentMarkets[0].toNumber()).to.equal(btcPriceMarketId);
  });

  it("ETH price market is correct", async () => {
    const market = await marketFactory.getMarket(ethPriceMarketId);
    const marketDetails = await marketFactory.getMarketDetails(ethPriceMarketId);
    const [above, notAbove] = market.shareTokens.map((addr) => OwnedERC20__factory.connect(addr, signer));

    expect(market.shareTokens.length).to.equal(2);
    expect(market.endTime).to.equal(nextResolutionTime);
    expect(market.winner).to.equal(NULL_ADDRESS);
    expect(marketDetails.marketType).to.equal(CryptoMarketType.PriceUpTo);
    expect(marketDetails.coinIndex).to.equal(CoinIndex.ETH);
    expect(marketDetails.price).to.equal(ethPrice);

    expect(await above.symbol()).to.equal("Above");
    expect(await above.name()).to.equal("Above");
    expect(await notAbove.symbol()).to.equal("Not Above");
    expect(await notAbove.name()).to.equal("Not Above");
  });

  it("BTC price market is correct", async () => {
    const market = await marketFactory.getMarket(btcPriceMarketId);
    const marketDetails = await marketFactory.getMarketDetails(btcPriceMarketId);
    const [above, notAbove] = market.shareTokens.map((addr) => OwnedERC20__factory.connect(addr, signer));

    expect(market.shareTokens.length).to.equal(2);
    expect(market.endTime).to.equal(nextResolutionTime);
    expect(market.winner).to.equal(NULL_ADDRESS);
    expect(marketDetails.marketType).to.equal(CryptoMarketType.PriceUpTo);
    expect(marketDetails.coinIndex).to.equal(CoinIndex.BTC);
    expect(marketDetails.price).to.equal(btcPrice);

    expect(await above.symbol()).to.equal("Above");
    expect(await above.name()).to.equal("Above");
    expect(await notAbove.symbol()).to.equal("Not Above");
    expect(await notAbove.name()).to.equal("Not Above");
  });

  it("can resolve and recreate markets", async () => {
    ethPrice = 2500;
    btcPrice = 55000;
    ethPriceFeed.smocked.latestRoundData.will.return.with([1, ethPrice * 1e8, 1, 1, 1]);
    btcPriceFeed.smocked.latestRoundData.will.return.with([1, btcPrice * 1e8, 1, 1, 1]);
    await network.provider.send("evm_setNextBlockTimestamp", [nextResolutionTime.toNumber()]);

    nextResolutionTime = nextResolutionTime.add(cadence);
    await marketFactory.createAndResolveMarkets(nextResolutionTime);

    const ethPriceMarket = await marketFactory.getMarket(ethPriceMarketId);
    const btcPriceMarket = await marketFactory.getMarket(btcPriceMarketId);

    expect(ethPriceMarket.winner).to.equal(ethPriceMarket.shareTokens[PriceUpDownOutcome.Above]);
    expect(btcPriceMarket.winner).to.equal(btcPriceMarket.shareTokens[PriceUpDownOutcome.NotAbove]);

    expect(await marketFactory.nextResolutionTime()).to.equal(nextResolutionTime);
  });

  it("new ETH price market is correct", async () => {
    ethPriceMarketId = BigNumber.from(3);
    const market = await marketFactory.getMarket(ethPriceMarketId);
    const marketDetails = await marketFactory.getMarketDetails(ethPriceMarketId);
    const [above, notAbove] = market.shareTokens.map((addr) => OwnedERC20__factory.connect(addr, signer));

    const ethCoin = await marketFactory.getCoin(CoinIndex.ETH);
    expect(ethCoin.currentMarkets[0]).to.equal(ethPriceMarketId);

    expect(market.endTime).to.equal(nextResolutionTime);
    expect(market.winner).to.equal(NULL_ADDRESS);
    expect(marketDetails.marketType).to.equal(CryptoMarketType.PriceUpTo);
    expect(marketDetails.coinIndex).to.equal(CoinIndex.ETH);
    expect(marketDetails.price).to.equal(ethPrice);

    expect(await above.symbol()).to.equal("Above");
    expect(await above.name()).to.equal("Above");
    expect(await notAbove.symbol()).to.equal("Not Above");
    expect(await notAbove.name()).to.equal("Not Above");
  });

  describe("trading", () => {
    it("can create pool", async () => {
      const basis = BigNumber.from(10).pow(18);
      const weights = [
        basis.mul(50).div(2), // 50% above
        basis.mul(50).div(2), // 50% not-above
      ];

      const initialLiquidity = usdcBasis.mul(1000); // 1000 of the collateral
      await collateral.faucet(initialLiquidity);
      await collateral.approve(ammFactory.address, initialLiquidity);

      await ammFactory.createPool(marketFactory.address, ethPriceMarketId, initialLiquidity, weights, signer.address);
    });

    it("can buy shares", async () => {
      const collateralIn = usdcBasis.mul(10);
      await collateral.faucet(collateralIn);
      await collateral.approve(ammFactory.address, collateralIn);
      await ammFactory.buy(marketFactory.address, ethPriceMarketId, PriceUpDownOutcome.Above, collateralIn, 0);
    });

    it("can sell shares", async () => {
      const setsInForCollateral = await marketFactory.calcShares(usdcBasis.mul(5));
      const [tokenAmountOut, shareTokensIn] = await calculateSellCompleteSetsWithValues(
        ammFactory,
        (marketFactory as unknown) as AbstractMarketFactory,
        ethPriceMarketId.toString(),
        PriceUpDownOutcome.Above,
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
        PriceUpDownOutcome.Above,
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
      const lpTokensIn = await ammFactory.getPoolTokenBalance(marketFactory.address, ethPriceMarketId, signer.address);
      const pool = await ammFactory
        .getPool(marketFactory.address, ethPriceMarketId)
        .then((address) => BPool__factory.connect(address, signer));
      await pool.approve(ammFactory.address, lpTokensIn);
      await ammFactory.removeLiquidity(marketFactory.address, ethPriceMarketId, lpTokensIn, 0, signer.address);
    });


    it("can resolve without creating", async () => {
      ethPrice = 2500;
      btcPrice = 55000;
      ethPriceFeed.smocked.latestRoundData.will.return.with([1, ethPrice * 1e8, 1, 1, 1]);
      btcPriceFeed.smocked.latestRoundData.will.return.with([1, btcPrice * 1e8, 1, 1, 1]);
      await network.provider.send("evm_setNextBlockTimestamp", [nextResolutionTime.toNumber()]);

      expect(await marketFactory.marketCount(), "market count before final resolution").to.equal(5);

      await marketFactory.createAndResolveMarkets(0);

      expect(await marketFactory.marketCount(), "market count after final resolution").to.equal(5);
    });
  });
});
