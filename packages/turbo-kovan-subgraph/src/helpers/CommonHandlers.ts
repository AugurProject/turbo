import { InitialCostPerMarket, LiquidityPositionBalance, PositionBalance } from "../../generated/schema";
import { getOrCreateMarket, getOrCreateSender } from "./AmmFactoryHelper";
import { bigIntToHexString, SHARES_DECIMALS, USDC_DECIMALS, ZERO } from "../utils";
import { LiquidityChanged, SharesSwapped } from "../../generated/AmmFactory/AmmFactory";
import { WinningsClaimed as WinningsClaimedV1 } from "../../generated/AbstractMarketFactoryV1/AbstractMarketFactory";
import { WinningsClaimed as WinningsClaimedV2 } from "../../generated/AbstractMarketFactoryV2/AbstractMarketFactory";
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
    entity.sharesFromTrades = ZERO;
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
  let id = marketId + "-" + senderId + "-" + event.params.outcome.toHexString();
  let positionBalanceEntity = getOrCreatePositionBalance(id, true, false);
  let initialCostPerMarket = getOrCreateInitialCostPerMarket(senderId + "-" + marketId + "-" + outcomeId);
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
      let initialCostUsdBigInt = buy ? positionBalanceEntity.initCostUsdBigInt + collateral : positionBalanceEntity.initCostUsdBigInt - collateral;
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

      let collateralBigDecimal = initialCostUsdBigInt.toBigDecimal().div(USDC_DECIMALS);
      let absCollateralBigDecimal = initialCostUsdBigInt.abs().toBigDecimal().div(USDC_DECIMALS);
      let sharesBigDecimal = sharesBigInt.toBigDecimal().div(SHARES_DECIMALS);
      positionBalanceEntity.shares = bigIntToHexString(sharesBigInt);
      positionBalanceEntity.sharesBigInt = sharesBigInt;
      positionBalanceEntity.sharesBigDecimal = sharesBigDecimal;
      positionBalanceEntity.initCostUsd = bigIntToHexString(initialCostUsdBigInt);
      positionBalanceEntity.initCostUsdBigInt = initialCostPerMarket.sumOfInitialCost;
      positionBalanceEntity.initCostUsdBigDecimal = initialCostPerMarket.sumOfInitialCostBigDecimal;
      positionBalanceEntity.avgPrice = initialCostPerMarket.avgPrice;
      positionBalanceEntity.open = sharesBigInt > ZERO;

      if (!buy) {
        let payoutBigInt = positionBalanceEntity.payoutBigInt + collateral;
        positionBalanceEntity.payout = bigIntToHexString(payoutBigInt);
        positionBalanceEntity.payoutBigInt = payoutBigInt;
        positionBalanceEntity.payoutBigDecimal = payoutBigInt.toBigDecimal().div(USDC_DECIMALS);
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
  let id = marketId + "-" + senderId + "-" + outcomeId.toHexString();
  let positionBalanceEntity = getOrCreatePositionBalance(id, true, false);
  let liquidityPositionBalanceId = senderId + "-" + marketId;
  getOrCreateMarket(marketId);
  getOrCreateSender(senderId);
  let liquidityPositionBalance = getOrCreateLiquidityPositionBalance(liquidityPositionBalanceId, true, false);
  let initialCostPerMarket = getOrCreateInitialCostPerMarket(senderId + "-" + marketId + "-" + outcomeId.toHexString());

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
        !!liquidityPositionBalance.sharesReturned &&
        !!initialCostPerMarket.avgPrice &&
        !!liquidityPositionBalance.avgPricePerOutcome
      ) {
        let liquidityPositionBalanceShares = sharesFromLiquidityPositionBalance.toBigDecimal().div(SHARES_DECIMALS);
        let firstSetTimesAvg = initialCostPerMarket.sharesFromTradesBigDecimal.times(initialCostPerMarket.avgPrice);
        let secondSetTimesAvg = liquidityPositionBalanceShares.times(avgPriceFromLiquidityPositionBalance);
        let combineMeansUp = firstSetTimesAvg.plus(secondSetTimesAvg);
        let combineMeansDown = initialCostPerMarket.sharesFromTradesBigDecimal.plus(liquidityPositionBalanceShares);
        initialCostPerMarket.avgPrice = combineMeansUp.div(combineMeansDown);
        initialCostPerMarket.sharesFromTrades = initialCostPerMarket.sharesFromTrades + sharesFromLiquidityPositionBalance;
        initialCostPerMarket.sharesFromTradesBigDecimal = initialCostPerMarket.sharesFromTradesBigDecimal + liquidityPositionBalanceShares;
        initialCostPerMarket.save();
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

export function handlePositionFromClaimWinningsEventV1(
  event: WinningsClaimedV1,
): void {
  let marketId = event.address.toHexString() + "-" + event.params.id.toString();
  let senderId = event.params.receiver.toHexString();
  let id = marketId + "-" + senderId + "-" + event.params.winningOutcome.toHexString();
  let positionBalanceEntity = getOrCreatePositionBalance(id, true, false);
  let initialCostPerMarketEntity = getOrCreateInitialCostPerMarket(senderId + "-" + marketId);
  getOrCreateMarket(marketId);
  getOrCreateSender(senderId);

  let logId = id + "-" + event.transaction.hash.toHexString();
  let log = positionBalanceEntity.log;
  if (log) {
    let wasAlreadySummed = log.includes(logId);
    if (!wasAlreadySummed) {
      log.push(logId);
      positionBalanceEntity.log = log

      let sharesBigInt = positionBalanceEntity.sharesBigInt - event.params.amount.abs();

      positionBalanceEntity.positionFromAddLiquidity = false;
      positionBalanceEntity.positionFromRemoveLiquidity = false;
      positionBalanceEntity.hasClaimed = true;
      positionBalanceEntity.transactionHash = event.transaction.hash.toHexString();
      positionBalanceEntity.timestamp = event.block.timestamp;
      positionBalanceEntity.outcomeId = event.params.winningOutcome.toHexString();
      positionBalanceEntity.marketId = marketId;
      positionBalanceEntity.market = marketId;
      positionBalanceEntity.senderId = senderId;
      positionBalanceEntity.sender = senderId;

      let initialCostBigDecimal = initialCostPerMarketEntity.sumOfInitialCost.toBigDecimal().div(USDC_DECIMALS);
      let absInitialCostBigDecimal = initialCostPerMarketEntity.sumOfInitialCost.abs().toBigDecimal().div(USDC_DECIMALS);
      let amountBigDecimal = event.params.amount.toBigDecimal().div(SHARES_DECIMALS);
      let absPayoutBigInt = positionBalanceEntity.payoutBigInt + event.params.payout.abs();
      let payoutBigDecimal = absPayoutBigInt.toBigDecimal().div(USDC_DECIMALS);
      let totalChangedUsd = event.params.payout - initialCostPerMarketEntity.sumOfInitialCost;
      let totalChangeUsdBigDecimal = totalChangedUsd.toBigDecimal().div(USDC_DECIMALS);
      positionBalanceEntity.shares = bigIntToHexString(event.params.amount);
      positionBalanceEntity.sharesBigInt = event.params.amount;
      positionBalanceEntity.sharesBigDecimal = amountBigDecimal;
      positionBalanceEntity.initCostUsd = bigIntToHexString(initialCostPerMarketEntity.sumOfInitialCost);
      positionBalanceEntity.initCostUsdBigInt = initialCostPerMarketEntity.sumOfInitialCost;
      positionBalanceEntity.initCostUsdBigDecimal = initialCostBigDecimal;
      positionBalanceEntity.payout = bigIntToHexString(absPayoutBigInt);
      positionBalanceEntity.payoutBigInt = absPayoutBigInt;
      positionBalanceEntity.payoutBigDecimal = payoutBigDecimal;
      positionBalanceEntity.totalChangeUsd = bigIntToHexString(totalChangedUsd);
      positionBalanceEntity.totalChangeUsdBigInt = totalChangedUsd;
      positionBalanceEntity.totalChangeUsdBigDecimal = totalChangeUsdBigDecimal;
      positionBalanceEntity.avgPrice = initialCostPerMarketEntity.avgPrice;
      positionBalanceEntity.settlementFee = bigIntToHexString(event.params.settlementFee);
      positionBalanceEntity.open = sharesBigInt > ZERO;

      positionBalanceEntity.save();
    }
  }
}

export function handlePositionFromClaimWinningsEventV2(
  event: WinningsClaimedV2,
): void {
  let marketId = event.address.toHexString() + "-" + event.params.id.toString();
  let senderId = event.params.receiver.toHexString();
  let id = marketId + "-" + senderId + "-" + event.params.winningOutcome.toHexString();
  let positionBalanceEntity = getOrCreatePositionBalance(id, true, false);
  let initialCostPerMarketEntity = getOrCreateInitialCostPerMarket(senderId + "-" + marketId);
  getOrCreateMarket(marketId);
  getOrCreateSender(senderId);

  let logId = id + "-" + event.transaction.hash.toHexString();
  let log = positionBalanceEntity.log;
  if (log) {
    let wasAlreadySummed = log.includes(logId);
    if (!wasAlreadySummed) {
      log.push(logId);
      positionBalanceEntity.log = log

      let sharesBigInt = positionBalanceEntity.sharesBigInt - event.params.amount.abs();

      positionBalanceEntity.positionFromAddLiquidity = false;
      positionBalanceEntity.positionFromRemoveLiquidity = false;
      positionBalanceEntity.hasClaimed = true;
      positionBalanceEntity.transactionHash = event.transaction.hash.toHexString();
      positionBalanceEntity.timestamp = event.block.timestamp;
      positionBalanceEntity.outcomeId = event.params.winningOutcome.toHexString();
      positionBalanceEntity.marketId = marketId;
      positionBalanceEntity.market = marketId;
      positionBalanceEntity.senderId = senderId;
      positionBalanceEntity.sender = senderId;

      let initialCostBigDecimal = initialCostPerMarketEntity.sumOfInitialCost.toBigDecimal().div(USDC_DECIMALS);
      let absInitialCostBigDecimal = initialCostPerMarketEntity.sumOfInitialCost.abs().toBigDecimal().div(USDC_DECIMALS);
      let amountBigDecimal = event.params.amount.toBigDecimal().div(SHARES_DECIMALS);
      let absPayoutBigInt = positionBalanceEntity.payoutBigInt + event.params.payout.abs();
      let payoutBigDecimal = absPayoutBigInt.toBigDecimal().div(USDC_DECIMALS);
      let totalChangedUsd = event.params.payout - initialCostPerMarketEntity.sumOfInitialCost;
      let totalChangeUsdBigDecimal = totalChangedUsd.toBigDecimal().div(USDC_DECIMALS);
      positionBalanceEntity.shares = bigIntToHexString(event.params.amount);
      positionBalanceEntity.sharesBigInt = event.params.amount;
      positionBalanceEntity.sharesBigDecimal = amountBigDecimal;
      positionBalanceEntity.initCostUsd = bigIntToHexString(initialCostPerMarketEntity.sumOfInitialCost);
      positionBalanceEntity.initCostUsdBigInt = initialCostPerMarketEntity.sumOfInitialCost;
      positionBalanceEntity.initCostUsdBigDecimal = initialCostBigDecimal;
      positionBalanceEntity.payout = bigIntToHexString(absPayoutBigInt);
      positionBalanceEntity.payoutBigInt = absPayoutBigInt;
      positionBalanceEntity.payoutBigDecimal = payoutBigDecimal;
      positionBalanceEntity.totalChangeUsd = bigIntToHexString(totalChangedUsd);
      positionBalanceEntity.totalChangeUsdBigInt = totalChangedUsd;
      positionBalanceEntity.totalChangeUsdBigDecimal = totalChangeUsdBigDecimal;
      positionBalanceEntity.avgPrice = initialCostPerMarketEntity.avgPrice;
      positionBalanceEntity.settlementFee = bigIntToHexString(event.params.settlementFee);
      positionBalanceEntity.open = sharesBigInt > ZERO;

      positionBalanceEntity.save();
    }
  }
}
