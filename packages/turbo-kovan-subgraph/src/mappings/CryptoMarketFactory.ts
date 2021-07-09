import { BigInt } from "@graphprotocol/graph-ts";
import { getOrCreateMarket } from "../helpers/AmmFactoryHelper";
import { getOrCreateCryptoMarket } from "../helpers/MarketFactoryHelper";
import { MarketCreated, MarketResolved } from "../../generated/CryptoMarketFactory/CryptoMarketFactory";

export function handleMarketCreatedEvent(event: MarketCreated): void {
  let marketId = event.address.toHexString() + "-" + event.params.id.toString();

  let entity = getOrCreateCryptoMarket(marketId, true, false);
  getOrCreateMarket(marketId);

  entity.marketId = marketId;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.timestamp = event.block.timestamp;
  entity.creator = event.params.creator.toHexString();
  entity.endTime = event.params.endTime;
  entity.marketType = BigInt.fromI32(event.params.marketType);
  entity.coinIndex = event.params.coinIndex;
  entity.price = event.params.price;

  entity.save();
}

export function handleMarketResolvedEvent(event: MarketResolved): void {
  let marketId = event.address.toHexString() + "-" + event.params.id.toString();

  let entity = getOrCreateCryptoMarket(marketId, false, false);

  if (entity) {
    entity.winner = event.params.winner.toHexString();

    entity.save();
  }
}
