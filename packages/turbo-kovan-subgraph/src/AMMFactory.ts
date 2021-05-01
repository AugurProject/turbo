import {
  AddLiquidity,
  AMMFactory,
  Liquidity,
  Market,
  Outcomes,
  RemoveLiquidity,
  Sender,
  Trades
} from "../generated/schema";
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

function addLiquidityEvent(event: LiquidityChanged): void {
  let id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let addLiquidityEntity = AddLiquidity.load(id);
  let senderEntity = Sender.load(id);

  if (addLiquidityEntity == null) {
    addLiquidityEntity = new AddLiquidity(id);
  }

  if (senderEntity == null) {
    senderEntity = new Sender(id);
  }

  senderEntity.save();

  addLiquidityEntity.transactionHash = event.transaction.hash.toHexString();
  addLiquidityEntity.timestamp = event.block.timestamp;
  addLiquidityEntity.collateral = event.params.collateral.toString();
  addLiquidityEntity.lpTokens = event.params.lpTokens.toString();

  addLiquidityEntity.save();
}

function removeLiquidityEvent(event: LiquidityChanged): void {
  let id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let removeLiquidityEntity = RemoveLiquidity.load(id);
  let senderEntity = Sender.load(id);
  let outcomesEntity = Outcomes.load(id);

  if (removeLiquidityEntity == null) {
    removeLiquidityEntity = new RemoveLiquidity(id);
  }

  if (senderEntity == null) {
    senderEntity = new Sender(id);
  }

  if (outcomesEntity == null) {
    outcomesEntity = new Outcomes(id);
  }

  senderEntity.save();
  outcomesEntity.save();

  removeLiquidityEntity.transactionHash = event.transaction.hash.toHexString();
  removeLiquidityEntity.timestamp = event.block.timestamp;

  removeLiquidityEntity.save();
}

export function handleLiquidityChangedEvent(event: LiquidityChanged): void {
  let id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let liquidityEntity = new Liquidity(id);

  let marketId = event.params.marketFactory.toHexString() + "-" + event.params.marketId.toString();
  let marketEntity = Market.load(marketId);
  if (marketEntity == null) {
    marketEntity = new Market(marketId);
  }
  marketEntity.save();

  liquidityEntity.marketFactory = event.params.marketFactory.toHexString();
  liquidityEntity.marketId = marketId;
  liquidityEntity.user = event.params.user.toHexString();
  liquidityEntity.recipient = event.params.recipient.toHexString();
  liquidityEntity.collateral = bigIntToHexString(event.params.collateral);
  liquidityEntity.lpTokens = bigIntToHexString(event.params.lpTokens);

  liquidityEntity.save();

  if (bigIntToHexString(event.params.collateral).substr(0, 1) == "-") {
    addLiquidityEvent(event);
  } else {
    removeLiquidityEvent(event);
  }
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
  let entity = new Trades(id);

  let marketId = event.params.marketFactory.toHexString() + "-" + event.params.marketId.toString();
  let marketEntity = Market.load(marketId);
  if (marketEntity == null) {
    marketEntity = new Market(marketId);
  }
  marketEntity.save();

  entity.marketFactory = event.params.marketFactory.toHexString();
  entity.marketId = marketId;
  entity.user = event.params.user.toHexString();
  entity.outcome = bigIntToHexString(event.params.outcome);
  entity.collateral = bigIntToHexString(event.params.collateral);
  entity.shares = bigIntToHexString(event.params.shares);

  entity.save();
}