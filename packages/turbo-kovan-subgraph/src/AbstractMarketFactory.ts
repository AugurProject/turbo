import { ClaimedProceeds, Outcomes, RemoveLiquidity, Sender, User, WinningsClaimed } from "../generated/schema";
import { WinningsClaimed as WinningsClaimedEvent } from "../generated/AbstractMarketFactory/AbstractMarketFactory";

// WinningsClaimed(
//   uint256 id,
//   uint256 amount,
//   address indexed receiver
// );
// WinningsClaimed(_id, _winningShares, msg.sender);

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

export function handleWinningsClaimedEvent(event: WinningsClaimedEvent): void {
  const id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  const entity = new ClaimedProceeds(id);
  let senderEntity = Sender.load(event.params.receiver.toHexString());

  if (senderEntity == null) {
    senderEntity = new Sender(event.params.receiver.toHexString());
  }

  senderEntity.save();

  entity.marketId = event.params.id.toHexString();
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.timestamp = event.block.timestamp;
  // TODO: confirm fields with Tom
  // entity.cash = event.params.cash;
  // entity.outcome = event.params.outcome;
  // entity.fees = event.params.fees;

  entity.save();
}
