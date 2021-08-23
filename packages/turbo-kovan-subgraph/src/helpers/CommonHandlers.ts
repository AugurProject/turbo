import { InitialCostPerMarket, LiquidityPositionBalance, PositionBalance } from "../../generated/schema";
import { getOrCreateMarket, getOrCreateSender } from "./AmmFactoryHelper";
import { bigIntToHexString, DUST_POSITION_AMOUNT_BIG_DECIMAL, SHARES_DECIMALS, USDC_DECIMALS, ZERO } from "../utils";
import { LiquidityChanged, SharesSwapped } from "../../generated/AmmFactory/AmmFactory";
import { BigInt } from "@graphprotocol/graph-ts/index";
import { BigDecimal } from "@graphprotocol/graph-ts";

export function getOrCreatePositionBalance (
  id: string,
  createIfNotFound: boolean = true,
  save: boolean = true
): PositionBalance {
  let entity = PositionBalance.load(id);

  if (entity == null && createIfNotFound) {
    entity = new PositionBalance(id);
    entity.sharesBigInt = ZERO;
    entity.initCostUsdBigInt = ZERO;
    entity.payoutBigInt = ZERO;
    entity.log = new Array<string>();

    if (save) {
      entity.save();
    }
  }

  return entity as PositionBalance;
}

export function getOrCreateInitialCostPerMarket (
  id: string,
  createIfNotFound: boolean = true,
  save: boolean = true
): InitialCostPerMarket {
  let entity = InitialCostPerMarket.load(id);

  if (entity == null && createIfNotFound) {
    entity = new InitialCostPerMarket(id);
    entity.sumOfInitialCost = ZERO;
    entity.sumOfInitialCostBigDecimal = ZERO.toBigDecimal();
    entity.sharesFromTrades = ZERO;
    entity.sharesFromTradesBigDecimal = ZERO.toBigDecimal();
    entity.avgPrice = ZERO.toBigDecimal();
    entity.log = new Array<string>();

    if (save) {
      entity.save();
    }
  }

  return entity as InitialCostPerMarket;
}

export function getOrCreateLiquidityPositionBalance (
  id: string,
  createIfNotFound: boolean = true,
  save: boolean = true
): LiquidityPositionBalance {
  let entity = LiquidityPositionBalance.load(id);

  if (entity == null && createIfNotFound) {
    entity = new LiquidityPositionBalance(id);
    entity.addCollateral = ZERO;
    entity.addCollateralBigDecimal = ZERO.toBigDecimal();
    entity.removeCollateral = ZERO;
    entity.removeCollateralBigDecimal = ZERO.toBigDecimal();
    entity.log = new Array<string>();
    entity.sharesReturned = new Array<BigInt>();
    entity.avgPricePerOutcome = new Array<BigDecimal>();

    if (save) {
      entity.save();
    }
  }

  return entity as LiquidityPositionBalance;
}

export function handlePositionFromTradeEvent(
  event: SharesSwapped
): void {
  let marketId = event.params.marketFactory.toHexString() + "-" + event.params.marketId.toString();
  let senderId = event.params.user.toHexString();
  let outcomeId = bigIntToHexString(event.params.outcome);
  let id = senderId + "-" + marketId + "-" + bigIntToHexString(event.params.outcome);
  let positionBalanceEntity = getOrCreatePositionBalance(id, true, false);
  let initialCostPerMarket = getOrCreateInitialCostPerMarket(id);
  getOrCreateMarket(marketId);
  getOrCreateSender(senderId);

  let logId = id + "-" + event.transaction.hash.toHexString();
  let log = positionBalanceEntity.log;
  if (log) {
    let wasAlreadySummed = log.includes(logId);
    if (!wasAlreadySummed) {
      log.push(logId);
      positionBalanceEntity.log = log

      let buy = event.params.collateral < ZERO;
      let collateral = event.params.collateral.abs();
      let shares = event.params.shares.abs();
      let sharesBigInt = buy ? positionBalanceEntity.sharesBigInt + shares : positionBalanceEntity.sharesBigInt - shares;

      positionBalanceEntity.positionFromAddLiquidity = false;
      positionBalanceEntity.positionFromRemoveLiquidity = false;
      positionBalanceEntity.hasClaimed = false;
      positionBalanceEntity.transactionHash = event.transaction.hash.toHexString();
      positionBalanceEntity.timestamp = event.block.timestamp;
      positionBalanceEntity.outcomeId = bigIntToHexString(event.params.outcome);
      positionBalanceEntity.marketId = marketId;
      positionBalanceEntity.market = marketId;
      positionBalanceEntity.senderId = senderId;
      positionBalanceEntity.sender = senderId;

      let sharesBigDecimal = sharesBigInt.toBigDecimal().div(SHARES_DECIMALS);
      positionBalanceEntity.shares = bigIntToHexString(sharesBigInt);
      positionBalanceEntity.sharesBigInt = sharesBigInt;
      positionBalanceEntity.sharesBigDecimal = sharesBigDecimal;
      positionBalanceEntity.initCostUsd = bigIntToHexString(initialCostPerMarket.sumOfInitialCost);
      positionBalanceEntity.initCostUsdBigInt = initialCostPerMarket.sumOfInitialCost;
      positionBalanceEntity.initCostUsdBigDecimal = initialCostPerMarket.sumOfInitialCostBigDecimal;
      positionBalanceEntity.avgPrice = initialCostPerMarket.avgPrice;
      positionBalanceEntity.open = sharesBigDecimal > DUST_POSITION_AMOUNT_BIG_DECIMAL;

      if (!buy) {
        let payoutBigInt = positionBalanceEntity.payoutBigInt + collateral;
        positionBalanceEntity.payout = bigIntToHexString(payoutBigInt);
        positionBalanceEntity.payoutBigInt = payoutBigInt;
        positionBalanceEntity.payoutBigDecimal = payoutBigInt.toBigDecimal().div(USDC_DECIMALS);
        let totalChangeUsd = payoutBigInt - initialCostPerMarket.sumOfInitialCost;
        positionBalanceEntity.totalChangeUsd = bigIntToHexString(totalChangeUsd);
        positionBalanceEntity.totalChangeUsdBigInt = totalChangeUsd;
        positionBalanceEntity.totalChangeUsdBigDecimal = totalChangeUsd.toBigDecimal().div(USDC_DECIMALS);
      }

      positionBalanceEntity.save();
    }
  }
}

export function handlePositionFromLiquidityChangedEvent(
  event: LiquidityChanged,
  positionFromAddLiquidity: boolean,
  sharesReturned: BigInt,
  outcomeId: BigInt,
  liquidityCollateralPerShare: BigInt
): void {
  let marketId = event.params.marketFactory.toHexString() + "-" + event.params.marketId.toString();
  let senderId = event.params.user.toHexString();
  let id = senderId + "-" + marketId + "-" + bigIntToHexString(outcomeId);
  let positionBalanceEntity = getOrCreatePositionBalance(id, true, false);
  let liquidityPositionBalanceId = senderId + "-" + marketId;
  getOrCreateMarket(marketId);
  getOrCreateSender(senderId);
  let liquidityPositionBalance = getOrCreateLiquidityPositionBalance(liquidityPositionBalanceId, true, false);
  let initialCostPerMarket = getOrCreateInitialCostPerMarket(id);

  let logId = id + "-" + event.transaction.hash.toHexString();
  let log = positionBalanceEntity.log;
  if (log) {
    let wasAlreadySummed = log.includes(logId);
    if (!wasAlreadySummed) {
      log.push(logId);
      positionBalanceEntity.log = log;

      let outcomeIndex = outcomeId.toI32();

      let array1: BigInt[] = liquidityPositionBalance.sharesReturned as BigInt[];
      let array2: BigDecimal[] = liquidityPositionBalance.avgPricePerOutcome as BigDecimal[];
      let sharesFromLiquidityPositionBalance: BigInt = ZERO;
      let avgPriceFromLiquidityPositionBalance: BigDecimal = ZERO.toBigDecimal();

      if (!!array1 && !!array1.length > outcomeIndex + 1) {
        sharesFromLiquidityPositionBalance = array1[outcomeIndex];
      }
      if (!!array2 && !!array2.length > outcomeIndex + 1) {
        avgPriceFromLiquidityPositionBalance = array2[outcomeIndex];
      }

      if (
        !!sharesFromLiquidityPositionBalance &&
        !!avgPriceFromLiquidityPositionBalance &&
        !!initialCostPerMarket.sharesFromTradesBigDecimal &&
        !!liquidityPositionBalance.sharesReturned
      ) {
        let liquidityPositionBalanceShares = sharesFromLiquidityPositionBalance.toBigDecimal().div(SHARES_DECIMALS);
        let firstSetTimesAvg = initialCostPerMarket.sharesFromTradesBigDecimal.times(initialCostPerMarket.avgPrice);
        let secondSetTimesAvg = liquidityPositionBalanceShares.times(avgPriceFromLiquidityPositionBalance);
        let combineMeansUp = firstSetTimesAvg.plus(secondSetTimesAvg);
        let combineMeansDown = initialCostPerMarket.sharesFromTradesBigDecimal.plus(liquidityPositionBalanceShares);
        if (combineMeansDown.gt(ZERO.toBigDecimal())) {
          initialCostPerMarket.avgPrice = combineMeansUp.div(combineMeansDown);
          initialCostPerMarket.sharesFromTrades = initialCostPerMarket.sharesFromTrades.plus(sharesFromLiquidityPositionBalance);
          initialCostPerMarket.sharesFromTradesBigDecimal = initialCostPerMarket.sharesFromTradesBigDecimal.plus(liquidityPositionBalanceShares);
          initialCostPerMarket.save();
        }
      }

      let collateral = liquidityCollateralPerShare.times(sharesReturned).abs();
      let initialCostUsdBigInt = positionFromAddLiquidity ? positionBalanceEntity.initCostUsdBigInt + collateral : positionBalanceEntity.initCostUsdBigInt - collateral;
      let sharesBigInt = positionBalanceEntity.sharesBigInt + sharesReturned.abs();

      positionBalanceEntity.positionFromAddLiquidity = positionFromAddLiquidity;
      positionBalanceEntity.positionFromRemoveLiquidity = !positionFromAddLiquidity;
      positionBalanceEntity.hasClaimed = false;
      positionBalanceEntity.transactionHash = event.transaction.hash.toHexString();
      positionBalanceEntity.timestamp = event.block.timestamp;
      positionBalanceEntity.outcomeId = bigIntToHexString(outcomeId);
      positionBalanceEntity.marketId = marketId;
      positionBalanceEntity.market = marketId;
      positionBalanceEntity.senderId = senderId;
      positionBalanceEntity.sender = senderId;

      let collateralBigDecimal = initialCostUsdBigInt.toBigDecimal().div(USDC_DECIMALS);
      let absCollateralBigDecimal = initialCostUsdBigInt.abs().toBigDecimal().div(USDC_DECIMALS);
      let sharesReturnedBigDecimal = sharesBigInt.toBigDecimal().div(SHARES_DECIMALS);
      positionBalanceEntity.shares = bigIntToHexString(sharesBigInt);
      positionBalanceEntity.sharesBigInt = sharesBigInt;
      positionBalanceEntity.sharesBigDecimal = sharesReturnedBigDecimal;
      positionBalanceEntity.initCostUsd = bigIntToHexString(initialCostUsdBigInt);
      positionBalanceEntity.initCostUsdBigInt = initialCostUsdBigInt;
      positionBalanceEntity.initCostUsdBigDecimal = collateralBigDecimal;
      // positionBalanceEntity.avgPrice = sharesReturnedBigDecimal > DUST_POSITION_AMOUNT_BIG_DECIMAL ? absCollateralBigDecimal.div(sharesReturnedBigDecimal) : positionBalanceEntity.avgPrice;
      positionBalanceEntity.open = sharesBigInt > ZERO;

      positionBalanceEntity.save();
    }
  }
}
