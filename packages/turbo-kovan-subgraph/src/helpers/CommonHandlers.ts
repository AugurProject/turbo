import { PositionBalance } from "../../generated/schema";
import { getOrCreateSender } from "./AmmFactoryHelper";
import { bigIntToHexString } from "../utils";
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
  positionBalanceEntity.avgPrice = event.params.collateral / event.params.shares;
  positionBalanceEntity.initCostUsd = bigIntToHexString(event.params.collateral);
  positionBalanceEntity.sender = senderId;
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
  // positionBalanceEntity.avgPrice = event.params.collateral / event.params.shares;
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
  positionBalanceEntity.avgPrice = event.params.payout / event.params.amount;
  // positionBalanceEntity.initCostUsd = bigIntToHexString(event.params.collateral);
  positionBalanceEntity.sender = senderId;
  positionBalanceEntity.save();
}