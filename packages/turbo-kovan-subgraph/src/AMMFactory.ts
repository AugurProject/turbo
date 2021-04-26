import { AMMFactory } from "../generated/schema";
import { PoolCreated } from "../generated/AMMFactory/AMMFactory";

export function handlePoolCreatedEvent(event: PoolCreated): void {
  let id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let entity = new AMMFactory(id);
  entity.pool = event.params.pool;
  entity.marketFactory = event.params.marketFactory;
  entity.marketId = event.params.marketId.toI32();
  entity.creator = event.params.creator;
  entity.save();
}