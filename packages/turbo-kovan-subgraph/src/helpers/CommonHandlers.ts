import { InitialCostPerMarket, PositionBalance } from "../../generated/schema";
import { getOrCreateSender } from "./AmmFactoryHelper";
import { bigIntToHexString, SHARES_DECIMALS, USDC_DECIMALS } from "../utils";
import { LiquidityChanged, SharesSwapped } from "../../generated/AmmFactory/AmmFactory";
import { WinningsClaimed } from "../../generated/AbstractMarketFactory/AbstractMarketFactory";
import { BigInt } from "@graphprotocol/graph-ts/index";

export function getOrCreatePositionBalance (
  id: string,
  createIfNotFound: boolean = true,
  save: boolean = true
): PositionBalance {
  let entity = PositionBalance.load(id);

  if (entity == null && createIfNotFound) {
    entity = new PositionBalance(id);

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
    entity.sumOfInitialCost = BigInt.fromI32(0);

    if (save) {
      entity.save();
    }
  }

  return entity as InitialCostPerMarket;
}

export function handlePositionFromTradeEvent(
  event: SharesSwapped
): void {
  let id = event.transaction.hash.toHexString() + "-" + event.params.outcome.toHexString();
  let marketId = event.params.marketFactory.toHexString() + "-" + event.params.marketId.toString();
  let senderId = event.params.user.toHexString();
  let positionBalanceEntity = getOrCreatePositionBalance(id, true, false);
  let initialCostPerMarketEntity = getOrCreateInitialCostPerMarket(senderId + "-" + marketId);
  getOrCreateSender(senderId);

  initialCostPerMarketEntity.market = marketId;
  initialCostPerMarketEntity.sender = senderId;
  initialCostPerMarketEntity.sumOfInitialCost += event.params.collateral;
  initialCostPerMarketEntity.save();

  positionBalanceEntity.positionFromAddLiquidity = false;
  positionBalanceEntity.positionFromRemoveLiquidity = false;
  positionBalanceEntity.hasClaimed = false;
  positionBalanceEntity.transactionHash = event.transaction.hash.toHexString();
  positionBalanceEntity.timestamp = event.block.timestamp;
  positionBalanceEntity.outcomeId = bigIntToHexString(event.params.outcome);
  positionBalanceEntity.market = marketId;
  positionBalanceEntity.sender = senderId;

  let collateralBigDecimal = event.params.collateral.toBigDecimal().div(USDC_DECIMALS);
  let sharesBigDecimal = (event.params.shares.toBigDecimal()).div(SHARES_DECIMALS);
  positionBalanceEntity.shares = bigIntToHexString(event.params.shares);
  positionBalanceEntity.sharesBigInt = event.params.shares;
  positionBalanceEntity.sharesBigDecimal = sharesBigDecimal;
  positionBalanceEntity.initCostUsd = bigIntToHexString(event.params.collateral);
  positionBalanceEntity.initCostUsdBigInt = event.params.collateral;
  positionBalanceEntity.initCostUsdBigDecimal = collateralBigDecimal;
  positionBalanceEntity.avgPrice = collateralBigDecimal.div(sharesBigDecimal);

  positionBalanceEntity.save();
}

export function handlePositionFromLiquidityChangedEvent(
  event: LiquidityChanged,
  positionFromAddLiquidity: boolean,
  sharesReturned: BigInt,
  outcomeId: BigInt
): void {
  let id = event.transaction.hash.toHexString() + "-" + outcomeId.toHexString();
  let marketId = event.params.marketFactory.toHexString() + "-" + event.params.marketId.toString();
  let senderId = event.params.user.toHexString();
  let positionBalanceEntity = getOrCreatePositionBalance(id, true, false);
  let initialCostPerMarketEntity = getOrCreateInitialCostPerMarket(senderId + "-" + marketId);
  getOrCreateSender(senderId);

  initialCostPerMarketEntity.market = marketId;
  initialCostPerMarketEntity.sender = senderId;
  initialCostPerMarketEntity.sumOfInitialCost += event.params.collateral;
  initialCostPerMarketEntity.save();

  positionBalanceEntity.positionFromAddLiquidity = positionFromAddLiquidity;
  positionBalanceEntity.positionFromRemoveLiquidity = !positionFromAddLiquidity;
  positionBalanceEntity.hasClaimed = false;
  positionBalanceEntity.transactionHash = event.transaction.hash.toHexString();
  positionBalanceEntity.timestamp = event.block.timestamp;
  positionBalanceEntity.outcomeId = bigIntToHexString(outcomeId);
  positionBalanceEntity.market = marketId;
  positionBalanceEntity.sender = senderId;

  let collateralBigDecimal = event.params.collateral.toBigDecimal().div(USDC_DECIMALS);
  let sharesReturnedBigDecimal = (sharesReturned.toBigDecimal()).div(SHARES_DECIMALS);
  positionBalanceEntity.shares = bigIntToHexString(sharesReturned);
  positionBalanceEntity.sharesBigInt = sharesReturned;
  positionBalanceEntity.sharesBigDecimal = sharesReturnedBigDecimal;
  positionBalanceEntity.initCostUsd = bigIntToHexString(event.params.collateral);
  positionBalanceEntity.initCostUsdBigInt = event.params.collateral;
  positionBalanceEntity.initCostUsdBigDecimal = collateralBigDecimal;
  positionBalanceEntity.avgPrice = collateralBigDecimal.div(sharesReturnedBigDecimal);

  positionBalanceEntity.save();
}

export function handlePositionFromClaimWinningsEvent(
  event: WinningsClaimed,
): void {
  let id = event.transaction.hash.toHexString() + "-" + event.params.winningOutcome.toHexString();
  let marketId = event.address.toHexString() + "-" + event.params.id.toString();
  let senderId = event.params.receiver.toHexString();
  let positionBalanceEntity = getOrCreatePositionBalance(id, true, false);
  let initialCostPerMarketEntity = getOrCreateInitialCostPerMarket(senderId + "-" + marketId);
  getOrCreateSender(senderId);

  positionBalanceEntity.positionFromAddLiquidity = false;
  positionBalanceEntity.positionFromRemoveLiquidity = false;
  positionBalanceEntity.hasClaimed = true;
  positionBalanceEntity.transactionHash = event.transaction.hash.toHexString();
  positionBalanceEntity.timestamp = event.block.timestamp;
  positionBalanceEntity.outcomeId = event.params.winningOutcome.toHexString();
  positionBalanceEntity.market = marketId;
  positionBalanceEntity.sender = senderId;

  let initialCostBigDecimal = initialCostPerMarketEntity.sumOfInitialCost.toBigDecimal().div(USDC_DECIMALS);
  let amountBigDecimal = event.params.amount.toBigDecimal().div(SHARES_DECIMALS);
  let payoutBigDecimal = event.params.payout.toBigDecimal().div(USDC_DECIMALS);
  let totalChangedUsd = event.params.payout - initialCostPerMarketEntity.sumOfInitialCost;
  let totalChangeUsdBigDecimal = totalChangedUsd.toBigDecimal().div(USDC_DECIMALS);
  positionBalanceEntity.shares = bigIntToHexString(event.params.amount);
  positionBalanceEntity.sharesBigInt = event.params.amount;
  positionBalanceEntity.sharesBigDecimal = amountBigDecimal;
  positionBalanceEntity.initCostUsd = bigIntToHexString(initialCostPerMarketEntity.sumOfInitialCost);
  positionBalanceEntity.initCostUsdBigInt = initialCostPerMarketEntity.sumOfInitialCost;
  positionBalanceEntity.initCostUsdBigDecimal = initialCostBigDecimal;
  positionBalanceEntity.payout = bigIntToHexString(event.params.payout);
  positionBalanceEntity.payoutBigInt = event.params.payout;
  positionBalanceEntity.payoutBigDecimal = payoutBigDecimal;
  positionBalanceEntity.totalChangeUsd = bigIntToHexString(totalChangedUsd);
  positionBalanceEntity.totalChangeUsdBigInt = totalChangedUsd;
  positionBalanceEntity.totalChangeUsdBigDecimal = totalChangeUsdBigDecimal;
  positionBalanceEntity.avgPrice = initialCostBigDecimal.div(amountBigDecimal);

  positionBalanceEntity.save();
}