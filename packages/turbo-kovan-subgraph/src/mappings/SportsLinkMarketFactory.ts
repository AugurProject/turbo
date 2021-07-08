import { getOrCreateMarket } from "../helpers/AmmFactoryHelper";
import { MarketCreated, MarketResolved } from "../../generated/SportsLinkMarketFactory/SportsLinkMarketFactory";

// event MarketCreated(
//   uint256 id,
//   address creator,
//   uint256 endTime,
//   MarketType marketType,
//   uint256 indexed eventId,
//   uint256 homeTeamId,
//   uint256 awayTeamId,
//   uint256 estimatedStartTime,
//   int256 score
// );
// event MarketResolved(uint256 id, address winner);

function handleMarketCreatedEvent(event: MarketCreated): void {
  let marketId = event.address.toHexString() + "-" + event.params.id.toString();

  let entity = getOrCreateMarket(marketId, true, false);

  entity.transactionHash = event.transaction.hash.toHexString();
  entity.timestamp = event.block.timestamp;
  entity.creator = event.params.creator.toHexString();
  entity.endTime = event.params.endTime;
  entity.marketType = event.params.marketType;
  entity.eventId = event.params.eventId;
  entity.homeTeamId = event.params.homeTeamId;
  entity.awayTeamId = event.params.awayTeamId;
  entity.estimatedStartTime = event.params.estimatedStartTime;
  entity.score = event.params.score;

  entity.save();
}

function handleMarketResolvedEvent(event: MarketResolved): void {
  let marketId = event.address.toHexString() + "-" + event.params.id.toString();

  let entity = getOrCreateMarket(marketId, true, false);

  entity.winner = event.params.winner.toHexString();

  entity.save();
}
