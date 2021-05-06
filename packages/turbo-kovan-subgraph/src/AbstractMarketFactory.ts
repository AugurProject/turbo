import { ClaimedFees, ClaimedProceeds, Sender } from "../generated/schema";
import { WinningsClaimed, SettlementFeeClaimed } from "../generated/AbstractMarketFactory/AbstractMarketFactory";
import { bigIntToHexString } from "./utils";

// ClaimedProceeds {
//   id
//   sender {
//     id
//   }
//   fees
//   outcome
//   marketId
//   cash
//   timestamp
//   tx_hash
// }

// collateral == cash
// shares == amount
// price is collateral/shares

export function handleWinningsClaimedEvent(event: WinningsClaimed): void {
  let id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let marketId = event.address.toHexString() + "-" + event.params.id.toString();
  let senderId = event.params.receiver.toHexString();
  let entity = new ClaimedProceeds(id);
  let senderEntity = Sender.load(senderId);

  if (senderEntity == null) {
    senderEntity = new Sender(senderId);
  }

  senderEntity.save();

  entity.marketId = marketId;
  entity.sender = senderId;
  entity.shares = bigIntToHexString(event.params.amount);
  entity.payout = bigIntToHexString(event.params.payout);
  entity.outcome = event.params.winningOutcome.toHexString();
  entity.fees = bigIntToHexString(event.params.settlementFee);
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.timestamp = event.block.timestamp;

  entity.save();
}

// ClaimedFees {
//   id
//   sender {
//     id
//   }
//   cash
//   marketId
//   timestamp
//   tx_hash
// }

// event SettlementFeeClaimed(
// address settlementAddress,
// uint256 amount,
// address indexed receiver
// );

export function handleSettlementFeeClaimedEvent(event: SettlementFeeClaimed): void {
  let id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let senderId = event.params.settlementAddress.toHexString();
  let entity = new ClaimedFees(id);
  let senderEntity = Sender.load(senderId);

  if (senderEntity == null) {
    senderEntity = new Sender(senderId);
  }

  senderEntity.save();

  entity.collateral = bigIntToHexString(event.params.amount);
  entity.sender = senderId;
  entity.receiver = event.params.receiver.toHexString();
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.timestamp = event.block.timestamp;

  entity.save();
}
