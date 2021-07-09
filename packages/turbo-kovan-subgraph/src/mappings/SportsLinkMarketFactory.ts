import { BigInt } from "@graphprotocol/graph-ts";
import { getOrCreateMarket } from "../helpers/AmmFactoryHelper";
import { getOrCreateTeamSportsMarket } from "../helpers/MarketFactoryHelper";
import { MarketCreated, MarketResolved } from "../../generated/SportsLinkMarketFactory/SportsLinkMarketFactory";

export function handleMarketCreatedEvent(event: MarketCreated): void {
  let marketId = event.address.toHexString() + "-" + event.params.id.toString();

  let entity = getOrCreateTeamSportsMarket(marketId, true, false);
  getOrCreateMarket(marketId);

  entity.marketId = marketId;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.timestamp = event.block.timestamp;
  entity.creator = event.params.creator.toHexString();
  entity.estimatedStartTime = event.params.estimatedStartTime;
  entity.endTime = event.params.endTime;
  entity.marketType = BigInt.fromI32(event.params.marketType);
  entity.eventId = event.params.eventId;
  entity.homeTeamId = event.params.homeTeamId;
  entity.awayTeamId = event.params.awayTeamId;
  entity.score = event.params.score;

  entity.save();
}

export function handleMarketResolvedEvent(event: MarketResolved): void {
  let marketId = event.address.toHexString() + "-" + event.params.id.toString();

  let entity = getOrCreateTeamSportsMarket(marketId, false, false);

  if (entity) {
    entity.winner = event.params.winner.toHexString();

    entity.save();
  }
}
