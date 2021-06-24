import { PositionBalance } from "../../generated/schema";
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

// type PositionBalance @entity {
//   id: ID!
//   outcomeId: String
//   positionFromAddLiquidity: Boolean # did the user get a position from adding liquidity
//   positionFromRemoveLiquidity: Boolean # did the user get a position from removing liquidity
//   hasClaimed: Boolean # has the user claimed winnings
//   timestamp: BigInt # last timestamp that effected user's position
//   shares: String # number of shares
//   outcomeId: String # market outcome id
//   # total paid / shares
//   avgPrice: String # average price user paid
//   # price * shares
//   initCostUsd: String # total cost in usdc, user paid
// }

export function handlePositionFromTradeEvent(
  event: SharesSwapped
): void {
  let id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let positionBalanceEntity = getOrCreatePositionBalance(id, true, false);
  let senderId = event.params.user.toHexString();
  getOrCreateSender(senderId);

  positionBalanceEntity.positionFromAddLiquidity = false;
  positionBalanceEntity.positionFromRemoveLiquidity = false;
  positionBalanceEntity.hasClaimed = false;
  positionBalanceEntity.transactionHash = event.transaction.hash.toHexString();
  positionBalanceEntity.timestamp = event.block.timestamp;
  positionBalanceEntity.shares = bigIntToHexString(event.params.shares);
  positionBalanceEntity.outcomeId = bigIntToHexString(event.params.outcome);
  positionBalanceEntity.initCostUsd = bigIntToHexString(event.params.collateral);
  positionBalanceEntity.sharesBigInt = event.params.shares;
  positionBalanceEntity.initCostUsdBigInt = event.params.collateral;

  positionBalanceEntity.sender = senderId;
  let collateralBigDecimal = event.params.collateral.toBigDecimal().div(USDC_DECIMALS);
  let sharesBigDecimal = (event.params.shares.toBigDecimal()).div(SHARES_DECIMALS);
  positionBalanceEntity.sharesBigDecimal = sharesBigDecimal;
  positionBalanceEntity.initCostUsdBigDecimal = collateralBigDecimal;
  positionBalanceEntity.avgPrice = collateralBigDecimal.div(sharesBigDecimal);

  positionBalanceEntity.save();
}

export function handlePositionFromLiquidityChangedEvent(
  event: LiquidityChanged,
  positionFromAddLiquidity: boolean,
  sharesReturned: BigInt
): void {
  let id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let positionBalanceEntity = getOrCreatePositionBalance(id, true, false);
  let senderId = event.params.user.toHexString();
  getOrCreateSender(senderId);

  positionBalanceEntity.positionFromAddLiquidity = positionFromAddLiquidity;
  positionBalanceEntity.positionFromRemoveLiquidity = !positionFromAddLiquidity;
  positionBalanceEntity.hasClaimed = false;
  positionBalanceEntity.transactionHash = event.transaction.hash.toHexString();
  positionBalanceEntity.timestamp = event.block.timestamp;
  positionBalanceEntity.shares = bigIntToHexString(sharesReturned);
  // positionBalanceEntity.outcomeId = bigIntToHexString(event.params.outcome);
  // positionBalanceEntity.avgPrice = event.params.collateral.div(event.params.shares);
  positionBalanceEntity.initCostUsd = bigIntToHexString(event.params.collateral);
  positionBalanceEntity.sender = senderId;
  positionBalanceEntity.save();
}

export function handlePositionFromClaimWinningsEvent(
  event: WinningsClaimed,
): void {
  let id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let positionBalanceEntity = getOrCreatePositionBalance(id, true, false);
  let senderId = event.params.receiver.toHexString();
  getOrCreateSender(senderId);

  positionBalanceEntity.positionFromAddLiquidity = false;
  positionBalanceEntity.positionFromRemoveLiquidity = false;
  positionBalanceEntity.hasClaimed = true;
  positionBalanceEntity.transactionHash = event.transaction.hash.toHexString();
  positionBalanceEntity.timestamp = event.block.timestamp;
  positionBalanceEntity.shares = bigIntToHexString(event.params.amount);
  positionBalanceEntity.outcomeId = event.params.winningOutcome.toHexString();
  let payoutBigDecimal = event.params.payout.toBigDecimal();
  let amountBigDecimal = event.params.amount.toBigDecimal();
  positionBalanceEntity.avgPrice = payoutBigDecimal.div(amountBigDecimal);
  // positionBalanceEntity.initCostUsd = bigIntToHexString(event.params.collateral);
  positionBalanceEntity.sender = senderId;
  positionBalanceEntity.save();
}