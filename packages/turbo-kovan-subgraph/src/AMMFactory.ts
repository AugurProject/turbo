import {
  AddLiquidity,
  AMMFactory,
  Buy,
  Liquidity,
  Market,
  Outcomes,
  RemoveLiquidity,
  Sell,
  Sender,
  Trade,
} from "../generated/schema";
import { PoolCreated, LiquidityChanged, SharesSwapped } from "../generated/AMMFactory/AMMFactory";
import { bigIntToHexString } from "./utils";
import { BigInt } from "@graphprotocol/graph-ts";

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
  entity.logPosition =
    event.block.number.toString().padStart(10, "0") + "-" + event.logIndex.toString().padStart(5, "0");
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
  let marketId = event.params.marketFactory.toHexString() + "-" + event.params.marketId.toString();
  let senderId = event.params.user.toHexString();
  let addLiquidityEntity = AddLiquidity.load(id);
  let senderEntity = Sender.load(senderId);

  if (addLiquidityEntity == null) {
    addLiquidityEntity = new AddLiquidity(id);
  }

  if (senderEntity == null) {
    senderEntity = new Sender(senderId);
  }

  senderEntity.save();

  addLiquidityEntity.transactionHash = event.transaction.hash.toHexString();
  addLiquidityEntity.timestamp = event.block.timestamp;
  addLiquidityEntity.collateral = bigIntToHexString(event.params.collateral);
  addLiquidityEntity.lpTokens = bigIntToHexString(event.params.lpTokens);
  addLiquidityEntity.marketId = marketId;
  addLiquidityEntity.sender = senderId;

  addLiquidityEntity.save();
}

function removeLiquidityEvent(event: LiquidityChanged): void {
  let id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let marketId = event.params.marketFactory.toHexString() + "-" + event.params.marketId.toString();
  let senderId = event.params.user.toHexString();
  let removeLiquidityEntity = RemoveLiquidity.load(id);
  let senderEntity = Sender.load(senderId);
  let outcomesEntity = Outcomes.load(id);

  if (removeLiquidityEntity == null) {
    removeLiquidityEntity = new RemoveLiquidity(id);
  }

  if (senderEntity == null) {
    senderEntity = new Sender(senderId);
  }

  if (outcomesEntity == null) {
    outcomesEntity = new Outcomes(id);
  }

  senderEntity.save();
  outcomesEntity.save();

  removeLiquidityEntity.transactionHash = event.transaction.hash.toHexString();
  removeLiquidityEntity.timestamp = event.block.timestamp;
  removeLiquidityEntity.collateral = bigIntToHexString(event.params.collateral);
  removeLiquidityEntity.lpTokens = bigIntToHexString(event.params.lpTokens);
  removeLiquidityEntity.marketId = marketId;
  removeLiquidityEntity.sender = senderId;

  removeLiquidityEntity.save();
}

export function handleLiquidityChangedEvent(event: LiquidityChanged): void {
  let id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let senderId = event.params.user.toHexString();
  let liquidityEntity = new Liquidity(id);

  let marketId = event.params.marketFactory.toHexString() + "-" + event.params.marketId.toString();
  let marketEntity = Market.load(marketId);
  if (marketEntity == null) {
    marketEntity = new Market(marketId);
  }
  marketEntity.save();

  liquidityEntity.marketFactory = event.params.marketFactory.toHexString();
  liquidityEntity.marketId = marketId;
  liquidityEntity.user = senderId;
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

function handleBuy(event: SharesSwapped): void {
  let id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let senderId = event.params.user.toHexString();
  let buyEntity = new Buy(id);
  let senderEntity = Sender.load(senderId);
  let outcomesEntity = Outcomes.load(id);

  if (senderEntity == null) {
    senderEntity = new Sender(senderId);
  }

  if (outcomesEntity == null) {
    outcomesEntity = new Outcomes(id);
  }

  senderEntity.save();
  outcomesEntity.save();

  buyEntity.transactionHash = event.transaction.hash.toHexString();
  buyEntity.timestamp = event.block.timestamp;
  buyEntity.sender = senderId;
  buyEntity.collateral = bigIntToHexString(event.params.collateral);
  buyEntity.shares = bigIntToHexString(event.params.shares);
  buyEntity.price = event.params.price.toBigDecimal().div(BigInt.fromI32(10).pow(18).toBigDecimal());

  buyEntity.save();
}

function handleSell(event: SharesSwapped): void {
  let id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let senderId = event.params.user.toHexString();
  let sellEntity = new Sell(id);
  let senderEntity = Sender.load(senderId);
  let outcomesEntity = Outcomes.load(id);

  if (senderEntity == null) {
    senderEntity = new Sender(senderId);
  }

  if (outcomesEntity == null) {
    outcomesEntity = new Outcomes(id);
  }

  senderEntity.save();
  outcomesEntity.save();

  sellEntity.transactionHash = event.transaction.hash.toHexString();
  sellEntity.timestamp = event.block.timestamp;
  sellEntity.sender = senderId;
  sellEntity.collateral = bigIntToHexString(event.params.collateral);
  sellEntity.shares = bigIntToHexString(event.params.shares);
  sellEntity.price = event.params.price.toBigDecimal().div(BigInt.fromI32(10).pow(18).toBigDecimal());

  sellEntity.save();
}

export function handleSharesSwappedEvent(event: SharesSwapped): void {
  let id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let senderId = event.params.user.toHexString();
  let tradeEntity = new Trade(id);

  let marketId = event.params.marketFactory.toHexString() + "-" + event.params.marketId.toString();
  let marketEntity = Market.load(marketId);
  if (marketEntity == null) {
    marketEntity = new Market(marketId);
    marketEntity.save();
  }

  tradeEntity.marketFactory = event.params.marketFactory.toHexString();
  tradeEntity.marketId = marketId;
  tradeEntity.user = senderId;
  tradeEntity.outcome = bigIntToHexString(event.params.outcome);
  tradeEntity.collateral = bigIntToHexString(event.params.collateral);
  tradeEntity.shares = bigIntToHexString(event.params.shares);
  tradeEntity.price = event.params.price.toBigDecimal().div(BigInt.fromI32(10).pow(18).toBigDecimal());

  tradeEntity.transactionHash = event.transaction.hash.toHexString();
  tradeEntity.timestamp = event.block.timestamp;

  tradeEntity.save();

  if (bigIntToHexString(event.params.collateral).substr(0, 1) == "-") {
    handleBuy(event);
  } else {
    handleSell(event);
  }
}
