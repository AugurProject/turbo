import { User, WinningsClaimed } from "../generated/schema";
import { WinningsClaimed as WinningsClaimedEvent } from "../generated/AbstractMarketFactory/AbstractMarketFactory";

// WinningsClaimed(uint256 id, uint256 amount, address indexed receiver);
// WinningsClaimed(_id, _winningShares, msg.sender);

export function handleWinningsClaimedEvent(event: WinningsClaimedEvent): void {
  let id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let entity = new WinningsClaimed(id);

  let userEntity = User.load(event.params.receiver.toHexString());
  if (userEntity == null) {
    userEntity = new User(event.params.receiver.toHexString());
  }
  userEntity.save();

  entity.marketId = event.params.id.toHexString();
  entity.user = event.params.receiver.toString();
  entity.winningShares = event.params.amount.toI32();

  entity.save();
}
