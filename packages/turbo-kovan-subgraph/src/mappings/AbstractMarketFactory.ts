import { SettlementFeeClaimed, WinningsClaimed } from "../../generated/AbstractMarketFactory/AbstractMarketFactory";
import { bigIntToHexString } from "../utils";
import { getOrCreateMarket, getOrCreateSender } from "../helpers/AmmFactoryHelper";
import { getOrCreateClaimedFees, getOrCreateClaimedProceeds } from "../helpers/AbstractMarketFactoryHelper";
import { handlePositionFromClaimWinningsEvent } from "../helpers/CommonHandlers";

export function handleWinningsClaimedEvent(event: WinningsClaimed): void {
  let id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let marketId = event.address.toHexString() + "-" + event.params.id.toString();
  let senderId = event.params.receiver.toHexString();
  let entity = getOrCreateClaimedProceeds(id, true, false);
  getOrCreateMarket(marketId);
  getOrCreateSender(senderId);

  entity.marketId = marketId;
  entity.sender = senderId;
  entity.shares = bigIntToHexString(event.params.amount);
  entity.payout = bigIntToHexString(event.params.payout);
  entity.outcome = event.params.winningOutcome.toHexString();
  entity.fees = bigIntToHexString(event.params.settlementFee);
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.timestamp = event.block.timestamp;

  handlePositionFromClaimWinningsEvent(event);

  entity.save();
}

export function handleSettlementFeeClaimedEvent(event: SettlementFeeClaimed): void {
  let id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let senderId = event.params.settlementAddress.toHexString();
  let entity = getOrCreateClaimedFees(id, true, false);
  getOrCreateSender(senderId);

  entity.collateral = bigIntToHexString(event.params.amount);
  entity.sender = senderId;
  entity.receiver = event.params.receiver.toHexString();
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.timestamp = event.block.timestamp;

  entity.save();
}
