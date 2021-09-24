import { getOrCreateMarket, getOrCreateSender } from "./AmmFactoryHelper";
import { bigIntToHexString, DUST_POSITION_AMOUNT_BIG_DECIMAL, SHARES_DECIMALS, USDC_DECIMALS, ZERO } from "../utils";
import { LiquidityChanged, SharesSwapped } from "../../generated/AmmFactory/AmmFactory";
import { BigInt } from "@graphprotocol/graph-ts/index";
import { BigDecimal } from "@graphprotocol/graph-ts";
import {
  getOrCreateInitialCostPerMarket,
  getOrCreateLiquidityPositionBalance,
  getOrCreatePositionBalance,
  getOrCreateSharesMinted
} from "./CommonHelper";
import { GenericSharesMintedParams } from "../types";

export function handlePositionFromTradeEvent(event: SharesSwapped): void {
  let marketId = event.params.marketFactory.toHexString() + "-" + event.params.marketId.toString();
  let senderId = event.params.user.toHexString();
  let outcomeId = bigIntToHexString(event.params.outcome);
  let id = senderId + "-" + marketId + "-" + bigIntToHexString(event.params.outcome);
  let positionBalanceEntity = getOrCreatePositionBalance(id, true, false);
  let initialCostPerMarket = getOrCreateInitialCostPerMarket(id);
  getOrCreateMarket(marketId);
  getOrCreateSender(senderId);
  let buy = event.params.collateral < ZERO;
  let collateral = event.params.collateral.abs();
  let shares = event.params.shares.abs();
  let sharesBigInt = buy
    ? positionBalanceEntity.sharesBigInt + shares
    : positionBalanceEntity.sharesBigInt - shares;

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
      initialCostPerMarket.sharesFromTrades = initialCostPerMarket.sharesFromTrades.plus(
        sharesFromLiquidityPositionBalance
      );
      initialCostPerMarket.sharesFromTradesBigDecimal = initialCostPerMarket.sharesFromTradesBigDecimal.plus(
        liquidityPositionBalanceShares
      );
      initialCostPerMarket.save();
    }
  }

  let collateral = liquidityCollateralPerShare.times(sharesReturned).abs();
  let initialCostUsdBigInt = positionFromAddLiquidity
    ? positionBalanceEntity.initCostUsdBigInt + collateral
    : positionBalanceEntity.initCostUsdBigInt - collateral;
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
  positionBalanceEntity.open = sharesBigInt > ZERO;

  positionBalanceEntity.save();
}

export function handleGenericSharesMintedEvent(params: GenericSharesMintedParams): void {
  let id = params.hash.toHexString() + "-" + params.marketFactory.toHexString() + "-" + params.marketIndex.toString() + "-" + params.receiver.toHexString();
  let entity = getOrCreateSharesMinted(id, true, false);
  entity.transactionHash = params.hash.toHexString();
  entity.timestamp = params.timestamp;
  entity.marketFactory = params.marketFactory.toHexString();
  entity.marketIndex = params.marketIndex.toString();
  entity.amount = params.amount;
  entity.amountBigDecimal = params.amount.toBigDecimal().div(SHARES_DECIMALS);
  entity.receiver = params.receiver.toHexString();
  entity.receiverId = params.receiver.toHexString();
  entity.save();
}