import { AMMFactory } from "../generated/schema";
import { PoolCreated } from "../generated/AMMFactory/AMMFactory";

export function handlePoolCreatedEvent(event: PoolCreated): void {
  let entity = new AMMFactory(event.params.pool.toHex());
  entity.marketFactory = event.params.marketFactory;
  entity.marketId = event.params.marketId.toI32();
  entity.creator = event.params.creator;
  entity.save();
}