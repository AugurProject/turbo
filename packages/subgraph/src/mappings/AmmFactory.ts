import {
  AmmFactory as AmmFactoryContract,
  LiquidityChanged,
  PoolCreated,
  SharesSwapped
} from "../../generated/AmmFactory/AmmFactory";
import { BPool as BPoolContract } from "../../generated/AmmFactory/BPool";
import {
  bigIntToHexString,
  BUY,
  DUST_POSITION_AMOUNT_BIG_DECIMAL,
  SELL,
  SHARES_DECIMALS,
  USDC_DECIMALS,
  ZERO
} from "../utils";
import { BigInt } from "@graphprotocol/graph-ts";
import {
  getOrCreateAddLiquidity,
  getOrCreateAmmFactory,
  getOrCreateLiquidity,
  getOrCreateMarket,
  getOrCreateOutcomes,
  getOrCreateRemoveLiquidity,
  getOrCreateSender,
  getOrCreateTrade
} from "../helpers/AmmFactoryHelper";
import {
  handlePositionFromLiquidityChangedEvent,
  handlePositionFromTradeEvent,
  handleTotalVolumePerDay,
  handleTotalVolumePerMarketPerDay
} from "../helpers/CommonHandlers";
import { getOrCreateInitialCostPerMarket, getOrCreateLiquidityPositionBalance } from "../helpers/CommonHelper";

export function handlePoolCreatedEvent(event: PoolCreated): void {
  let id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let entity = getOrCreateAmmFactory(id, true, false);

  entity.blockHash = event.block.hash.toHexString();
  entity.blockNumber = event.block.number.toI32();
  entity.logIndex = event.logIndex.toI32();
  entity.logPosition =
    event.block.number.toString().padStart(10, "0") + "-" + event.logIndex.toString().padStart(5, "0");
  entity.name = "PoolCreated";
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.origin = event.transaction.from.toHexString();

  entity.pool = event.params.pool.toHexString();
  entity.marketFactory = event.params.marketFactory.toHexString();
  entity.marketId = event.params.marketId.toI32();
  entity.creator = event.params.creator.toHexString();
  entity.lpTokenRecipient = event.params.lpTokenRecipient.toHexString();
  entity.save();
}

function liquidityCollateralPerShare(collateral: BigInt, sharesReturnedArray: BigInt[]): BigInt {
  let totalSharesReturned = BigInt.fromI32(0);
  for (let i = 0; i < sharesReturnedArray.length; i++) {
    totalSharesReturned += sharesReturnedArray[i];
  }
  return totalSharesReturned.gt(BigInt.fromI32(0)) ? collateral / totalSharesReturned : BigInt.fromI32(0);
}

function calculateInitialCostPerOutcome(
  senderId: string,
  marketId: string,
  logId: string,
  collateral: BigInt,
  outcome: string,
  shares: BigInt
): void {
  let entity = getOrCreateInitialCostPerMarket(senderId + "-" + marketId + "-" + outcome);
  let log = entity.log;
  if (!!entity.sharesFromTrades) {
    let buy = collateral.lt(ZERO);
    let absCollateral = collateral.abs();
    let absShares = shares.abs();
    let sumOfShares = buy ? entity.sharesFromTrades.plus(absShares) : entity.sharesFromTrades.minus(absShares);
    let sumOfSharesBigDecimal = sumOfShares.toBigDecimal().div(SHARES_DECIMALS);
    let soldAllSharesFromTrade = sumOfSharesBigDecimal.le(DUST_POSITION_AMOUNT_BIG_DECIMAL);
    entity.market = marketId;
    entity.sender = senderId;
    entity.outcome = outcome;
    if (!soldAllSharesFromTrade) {
      let sumOfInitialCost = buy
        ? entity.sumOfInitialCost.plus(absCollateral)
        : entity.sumOfInitialCost.minus(absCollateral);
      let sumOfInitialCostBigDecimal = sumOfInitialCost.toBigDecimal().div(USDC_DECIMALS);
      entity.sharesFromTrades = sumOfShares;
      entity.sharesFromTradesBigDecimal = sumOfSharesBigDecimal;
      entity.sumOfInitialCost = sumOfInitialCost;
      entity.sumOfInitialCostBigDecimal = sumOfInitialCostBigDecimal;
      entity.avgPrice = sumOfInitialCostBigDecimal.div(sumOfSharesBigDecimal);
    }
    entity.save();
  }
}

function addLiquidityEvent(event: LiquidityChanged, totalSupply: BigInt | null): void {
  let id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let marketId = event.params.marketFactory.toHexString() + "-" + event.params.marketId.toString();
  let senderId = event.params.user.toHexString();
  let liquidityPositionBalanceId = senderId + "-" + marketId;

  let addLiquidityEntity = getOrCreateAddLiquidity(id, true, false);
  getOrCreateMarket(marketId);
  getOrCreateSender(senderId);
  let liquidityPositionBalance = getOrCreateLiquidityPositionBalance(liquidityPositionBalanceId, true, false);
  let collateralBigDecimal = event.params.collateral.toBigDecimal().div(USDC_DECIMALS);
  let absCollateral = event.params.collateral.abs();
  let absCollateralBigDecimal = absCollateral.toBigDecimal().div(USDC_DECIMALS);
  liquidityPositionBalance.addCollateral = liquidityPositionBalance.addCollateral + absCollateral;
  liquidityPositionBalance.addCollateralBigDecimal =
    liquidityPositionBalance.addCollateralBigDecimal + absCollateralBigDecimal;
  liquidityPositionBalance.save();

  addLiquidityEntity.transactionHash = event.transaction.hash.toHexString();
  addLiquidityEntity.timestamp = event.block.timestamp;
  addLiquidityEntity.collateral = bigIntToHexString(event.params.collateral);
  addLiquidityEntity.collateralBigInt = event.params.collateral;
  addLiquidityEntity.collateralBigDecimal = collateralBigDecimal;
  addLiquidityEntity.lpTokens = bigIntToHexString(event.params.lpTokens);
  addLiquidityEntity.marketId = marketId;
  addLiquidityEntity.sender = senderId;
  addLiquidityEntity.totalSupply = totalSupply;
  addLiquidityEntity.sharesReturned = event.params.sharesReturned;

  let sharesReturnedArray: BigInt[] = event.params.sharesReturned;
  let liquidityCollateralPerShare = liquidityCollateralPerShare(event.params.collateral, sharesReturnedArray);
  for (let i = 0; i < sharesReturnedArray.length; i++) {
    if (sharesReturnedArray[i].toBigDecimal().div(SHARES_DECIMALS) >= DUST_POSITION_AMOUNT_BIG_DECIMAL) {
      handlePositionFromLiquidityChangedEvent(
        event,
        true,
        sharesReturnedArray[i],
        BigInt.fromI32(i),
        liquidityCollateralPerShare
      );
    }
  }

  addLiquidityEntity.save();
}

function removeLiquidityEvent(event: LiquidityChanged, totalSupply: BigInt | null): void {
  let id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let marketId = event.params.marketFactory.toHexString() + "-" + event.params.marketId.toString();
  let senderId = event.params.user.toHexString();
  let removeLiquidityEntity = getOrCreateRemoveLiquidity(id, true, false);
  let liquidityPositionBalanceId = senderId + "-" + marketId;
  let sharesReturnedArray: BigInt[] = event.params.sharesReturned;
  let collateralBigDecimal = event.params.collateral.toBigDecimal().div(USDC_DECIMALS);
  let absCollateral = event.params.collateral.abs();
  let absCollateralBigDecimal = absCollateral.toBigDecimal().div(USDC_DECIMALS);
  getOrCreateMarket(marketId);
  getOrCreateSender(senderId);
  getOrCreateOutcomes(id);
  let liquidityPositionBalance = getOrCreateLiquidityPositionBalance(liquidityPositionBalanceId, true, false);
  liquidityPositionBalance.removeCollateral = absCollateral;
  liquidityPositionBalance.removeCollateralBigDecimal = absCollateral.toBigDecimal().div(USDC_DECIMALS);
  liquidityPositionBalance.sharesReturned = event.params.sharesReturned;
  let numberOfOutcomesThatGotShares = sharesReturnedArray.filter(
    (shares) => shares.toBigDecimal().div(SHARES_DECIMALS) >= DUST_POSITION_AMOUNT_BIG_DECIMAL
  ).length;
  if (numberOfOutcomesThatGotShares > 0) {
    let addLiquidityMinusRemoveLiquidity = liquidityPositionBalance.addCollateralBigDecimal.minus(
      absCollateralBigDecimal
    );
    let collateralPerOutcomeBigDecimal = addLiquidityMinusRemoveLiquidity.div(
      BigInt.fromI32(numberOfOutcomesThatGotShares).toBigDecimal()
    );
    let avgPricePerOutcome = liquidityPositionBalance.avgPricePerOutcome;
    for (let i = 0; i < sharesReturnedArray.length; i++) {
      if (avgPricePerOutcome) {
        let sharesReturned = sharesReturnedArray[i].toBigDecimal().div(SHARES_DECIMALS);
        let isItBiggerThanDust = sharesReturned.gt(DUST_POSITION_AMOUNT_BIG_DECIMAL);
        if (sharesReturned.gt(DUST_POSITION_AMOUNT_BIG_DECIMAL)) {
          let calcAvgPricePerOutcome = collateralPerOutcomeBigDecimal.div(sharesReturned);
          avgPricePerOutcome.push(calcAvgPricePerOutcome);
        } else {
          avgPricePerOutcome.push(ZERO.toBigDecimal());
        }
      }
    }
    liquidityPositionBalance.avgPricePerOutcome = avgPricePerOutcome;
  }
  liquidityPositionBalance.save();

  removeLiquidityEntity.transactionHash = event.transaction.hash.toHexString();
  removeLiquidityEntity.timestamp = event.block.timestamp;
  removeLiquidityEntity.collateral = bigIntToHexString(event.params.collateral);
  removeLiquidityEntity.collateralBigInt = event.params.collateral;
  removeLiquidityEntity.collateralBigDecimal = collateralBigDecimal;
  removeLiquidityEntity.lpTokens = bigIntToHexString(event.params.lpTokens);
  removeLiquidityEntity.marketId = marketId;
  removeLiquidityEntity.sender = senderId;
  removeLiquidityEntity.totalSupply = totalSupply;
  removeLiquidityEntity.sharesReturned = event.params.sharesReturned;

  let liquidityCollateralPerShare = liquidityCollateralPerShare(event.params.collateral, sharesReturnedArray);
  for (let i = 0; i < sharesReturnedArray.length; i++) {
    if (sharesReturnedArray[i].toBigDecimal().div(SHARES_DECIMALS) >= DUST_POSITION_AMOUNT_BIG_DECIMAL) {
      handlePositionFromLiquidityChangedEvent(
        event,
        false,
        sharesReturnedArray[i],
        BigInt.fromI32(i),
        liquidityCollateralPerShare
      );
    }
  }

  removeLiquidityEntity.save();
}

export function handleLiquidityChangedEvent(event: LiquidityChanged): void {
  let id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let marketId = event.params.marketFactory.toHexString() + "-" + event.params.marketId.toString();
  let senderId = event.params.user.toHexString();
  let liquidityEntity = getOrCreateLiquidity(id, true, false);
  getOrCreateMarket(marketId);
  let sender = getOrCreateSender(senderId);
  sender.totalLiquidity = sender.totalLiquidity + event.params.collateral;
  sender.save();

  let ammContractInstance = AmmFactoryContract.bind(event.address);
  let poolAddress = ammContractInstance.pools(event.params.marketFactory, event.params.marketId);
  let bPool = BPoolContract.bind(poolAddress);
  let totalSupply: BigInt | null = null;
  let collateralBigDecimal = event.params.collateral.toBigDecimal().div(USDC_DECIMALS);

  liquidityEntity.transactionHash = event.transaction.hash.toHexString();
  liquidityEntity.timestamp = event.block.timestamp;
  liquidityEntity.marketFactory = event.params.marketFactory.toHexString();
  liquidityEntity.marketId = marketId;
  liquidityEntity.sender = senderId;
  liquidityEntity.recipient = event.params.recipient.toHexString();
  liquidityEntity.collateral = bigIntToHexString(event.params.collateral);
  liquidityEntity.collateralBigInt = event.params.collateral;
  liquidityEntity.collateralBigDecimal = collateralBigDecimal;
  liquidityEntity.lpTokens = bigIntToHexString(event.params.lpTokens);
  liquidityEntity.sharesReturned = event.params.sharesReturned;

  let tryTotalSupply = bPool.try_totalSupply();

  if (!tryTotalSupply.reverted) {
    totalSupply = tryTotalSupply.value;
  }
  liquidityEntity.totalSupply = totalSupply;

  liquidityEntity.save();

  if (bigIntToHexString(event.params.collateral).substr(0, 1) == "-") {
    addLiquidityEvent(event, totalSupply);
  } else {
    removeLiquidityEvent(event, totalSupply);
  }
}

export function handleSharesSwappedEvent(event: SharesSwapped): void {
  let id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let marketId = event.params.marketFactory.toHexString() + "-" + event.params.marketId.toString();
  let senderId = event.params.user.toHexString();
  let tradeEntity = getOrCreateTrade(id, true, false);
  let buy = event.params.collateral.lt(ZERO);

  getOrCreateMarket(marketId);
  getOrCreateSender(senderId);

  let outcome = bigIntToHexString(event.params.outcome);
  let collateralBigDecimal = event.params.collateral.toBigDecimal().div(USDC_DECIMALS);
  let sharesBigDecimal = event.params.shares.toBigDecimal().div(SHARES_DECIMALS);

  tradeEntity.marketFactory = event.params.marketFactory.toHexString();
  tradeEntity.marketId = marketId;
  tradeEntity.user = senderId;
  tradeEntity.sender = senderId;
  tradeEntity.outcome = outcome;
  tradeEntity.collateral = bigIntToHexString(event.params.collateral);
  tradeEntity.collateralBigInt = event.params.collateral;
  tradeEntity.collateralBigDecimal = collateralBigDecimal;
  tradeEntity.shares = bigIntToHexString(event.params.shares);
  tradeEntity.sharesBigInt = event.params.shares;
  tradeEntity.sharesBigDecimal = sharesBigDecimal;
  tradeEntity.price = event.params.price.toBigDecimal().div(BigInt.fromI32(10).pow(18).toBigDecimal());

  tradeEntity.transactionHash = event.transaction.hash.toHexString();
  tradeEntity.timestamp = event.block.timestamp;

  let logId =
    event.transaction.hash.toHexString() +
    "-" +
    bigIntToHexString(event.params.outcome) +
    "-" +
    event.params.collateral.toString();
  calculateInitialCostPerOutcome(senderId, marketId, logId, event.params.collateral, outcome, event.params.shares);

  handlePositionFromTradeEvent(event);

  if (buy) {
    handleTotalVolumePerDay(event.params.collateral, event.block.timestamp, BUY);
    handleTotalVolumePerMarketPerDay(event.params.collateral, event.block.timestamp, BUY, marketId);
  } else {
    handleTotalVolumePerDay(event.params.collateral, event.block.timestamp, SELL);
    handleTotalVolumePerMarketPerDay(event.params.collateral, event.block.timestamp, SELL, marketId);
  }

  tradeEntity.save();
}
