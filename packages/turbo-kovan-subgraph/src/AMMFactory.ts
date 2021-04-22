import { AMMFactory } from "../generated/schema";
import { PoolCreated } from '../generated/AMMFactory/AMMFactory'

export function handlePoolCreatedEvent(event: PoolCreated): void {
  let poolCreated = new PoolCreated(event.params.id.toHex());
  poolCreated.pool = event.params.pool;
  poolCreated.marketFactory = event.params.marketFactory;
  poolCreated.marketId = event.params.marketId;
  poolCreated.creator = event.params.creator;
  poolCreated.save();
}