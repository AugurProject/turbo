import { BigInt } from "@graphprotocol/graph-ts";
import { getOrCreateMarket } from "../helpers/AmmFactoryHelper";
import { getOrCreateMmaMarket } from "../helpers/MarketFactoryHelper";
import { MarketCreated, MarketResolved } from "../../generated/MmaMarketFactory/MmaMarketFactory";

export function handleMarketCreatedEvent(event: MarketCreated): void {
  let marketId = event.address.toHexString() + "-" + event.params.id.toString();

  let entity = getOrCreateMmaMarket(marketId, true, false);
  getOrCreateMarket(marketId);

  entity.marketId = marketId;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.timestamp = event.block.timestamp;
  entity.creator = event.params.creator.toHexString();
  entity.estimatedStartTime = event.params.estimatedStartTime;
  entity.endTime = event.params.endTime;
  entity.marketType = BigInt.fromI32(event.params.marketType);
  entity.eventId = event.params.eventId;
  entity.homeFighterName = event.params.homeFighterName;
  entity.homeFighterId = event.params.homeFighterId;
  entity.awayFighterName = event.params.awayFighterName;
  entity.awayFighterId = event.params.awayFighterId;

  entity.save();
}

export function handleMarketResolvedEvent(event: MarketResolved): void {
  let marketId = event.address.toHexString() + "-" + event.params.id.toString();

  let entity = getOrCreateMmaMarket(marketId, false, false);

  if (entity) {
    entity.winner = event.params.winner.toHexString();

    entity.save();
  }
}
