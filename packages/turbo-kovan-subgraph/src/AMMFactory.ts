import { AMMFactory, Liquidity, Market, Shares } from "../generated/schema";
import { PoolCreated, LiquidityChanged, SharesSwapped } from "../generated/AMMFactory/AMMFactory";
import { bigIntToHexString } from "./utils";

// event PoolCreated(
//   address pool,
//   address indexed marketFactory,
//   uint256 indexed marketId,
//   address indexed creator,
//   address lpTokenRecipient
// );

export function handlePoolCreatedEvent(event: PoolCreated): void {
  let id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let entity = new AMMFactory(id);

  entity.blockHash = event.block.hash.toHexString();
  entity.blockNumber = event.block.number.toI32();
  entity.logIndex = event.logIndex.toI32();
  entity.logPosition = event.block.number.toString().padStart(10, "0") + "-" + event.logIndex.toString().padStart(5, "0");
  entity.name = "PoolCreated";
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.origin = event.transaction.from.toHexString();

  entity.pool = event.params.pool.toHexString();
  entity.marketFactory = event.params.marketFactory.toHexString();
  entity.marketId = event.params.marketId.toI32();
  entity.creator = event.params.creator.toHexString();
  entity.lpTokenRecipient = event.params.lpTokenRecipient.toHexString();
  entity.save();
}

// event LiquidityChanged(
//   address indexed marketFactory,
//   uint256 indexed marketId,
//   address indexed user,
//   address recipient,
//   // from the perspective of the user. e.g. collateral is negative when adding liquidity
//   int256 collateral,
//   int256 lpTokens
// );

export function handleLiquidityChangedEvent(event: LiquidityChanged): void {
  let id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let entity = new Liquidity(id);

  let marketId = event.params.marketFactory.toHexString() + "-" + event.params.marketId.toString();
  let marketEntity = Market.load(marketId);
  if (marketEntity == null) {
    marketEntity = new Market(marketId);
  }
  marketEntity.save();

  entity.marketFactory = event.params.marketFactory.toHexString();
  entity.marketId = event.params.marketId.toString();
  entity.user = event.params.user.toHexString();
  entity.recipient = event.params.recipient.toHexString();
  entity.collateral = bigIntToHexString(event.params.collateral);
  entity.lpTokens = bigIntToHexString(event.params.lpTokens);

  entity.save();
}

// event SharesSwapped(
//   address indexed marketFactory,
//   uint256 indexed marketId,
//   address indexed user,
//   uint256 outcome,
//   // from the perspective of the user. e.g. collateral is negative when buying
//   int256 collateral,
//   int256 shares
// );

export function handleSharesSwappedEvent(event: SharesSwapped): void {
  let id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let entity = new Shares(id);

  let marketId = event.params.marketFactory.toHexString() + "-" + event.params.marketId.toString();
  let marketEntity = Market.load(marketId);
  if (marketEntity == null) {
    marketEntity = new Market(marketId);
  }
  marketEntity.save();

  entity.marketFactory = event.params.marketFactory.toHexString();
  entity.marketId = event.params.marketId.toString();
  entity.user = event.params.user.toHexString();
  entity.outcome = bigIntToHexString(event.params.outcome);
  entity.collateral = bigIntToHexString(event.params.collateral);
  entity.shares = bigIntToHexString(event.params.shares);

  entity.save();
}