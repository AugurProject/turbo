import { Address, BigInt } from "@graphprotocol/graph-ts";
import { getOrCreateMarket } from "../helpers/AmmFactoryHelper";
import { getOrCreateCryptoMarket } from "../helpers/MarketFactoryHelper";
import {
  CryptoMarketFactory as CryptoMarketFactoryContract,
  MarketCreated,
  MarketResolved
} from "../../generated/CryptoMarketFactory/CryptoMarketFactory";

function getShareTokens(contractAddress: Address, marketId: BigInt): Array<String> {
  let contract = CryptoMarketFactoryContract.bind(contractAddress);
  let marketDetails = contract.getMarket(marketId);

  let rawShareTokens = marketDetails.shareTokens;
  let shareTokens = new Array<String>();
  for (let i = 0; i < rawShareTokens.length; i++) {
    shareTokens.push(rawShareTokens[i].toHexString());
  }

  return shareTokens;
}

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
  entity.creationPrice = event.params.price;
  entity.shareTokens = getShareTokens(event.address, event.params.id);

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
