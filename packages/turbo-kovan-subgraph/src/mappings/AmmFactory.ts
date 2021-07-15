import {
  AmmFactory as AmmFactoryContract,
  LiquidityChanged,
  PoolCreated,
  SharesSwapped
} from "../../generated/AmmFactory/AmmFactory";
import { BPool as BPoolContract } from "../../generated/AmmFactory/BPool";
import { bigIntToHexString, DUST_POSITION_AMOUNT_BIG_DECIMAL, SHARES_DECIMALS } from "../utils";
import { BigInt } from "@graphprotocol/graph-ts";
import {
  getOrCreateAddLiquidity,
  getOrCreateAmmFactory,
  getOrCreateLiquidity,
  getOrCreateMarket,
  getOrCreateOutcomes,
  getOrCreateRemoveLiquidity,
  getOrCreateSender,
  getOrCreateTrade
} from "../helpers/AmmFactoryHelper";
import {
  getOrCreateInitialCostPerMarket,
  handlePositionFromLiquidityChangedEvent,
  handlePositionFromTradeEvent
} from "../helpers/CommonHandlers";

export function handlePoolCreatedEvent(event: PoolCreated): void {
  let id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let entity = getOrCreateAmmFactory(id, true, false);

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

function liquidityCollateralPerShare(collateral: BigInt, sharesReturnedArray: BigInt[]): BigInt {
  let totalSharesReturned = BigInt.fromI32(0);
  for (let i = 0; i < sharesReturnedArray.length; i++) {
    totalSharesReturned += sharesReturnedArray[i];
  }
  return totalSharesReturned.gt(BigInt.fromI32(0)) ? collateral / totalSharesReturned : BigInt.fromI32(0);
}

function calculateInitialCostPerMarket(senderId: string, marketId: string, logId: string, collateral: BigInt): void {
  let initialCostPerMarketEntity = getOrCreateInitialCostPerMarket(senderId + "-" + marketId);
  let log = initialCostPerMarketEntity.log;
  if (log) {
    let wasAlreadySummed = log.includes(logId);
    if (!wasAlreadySummed) {
      log.push(logId);
      initialCostPerMarketEntity.log = log
      initialCostPerMarketEntity.market = marketId;
      initialCostPerMarketEntity.sender = senderId;
      initialCostPerMarketEntity.sumOfInitialCost = initialCostPerMarketEntity.sumOfInitialCost.plus(collateral);
      initialCostPerMarketEntity.save();
    }
  }
}

function addLiquidityEvent(event: LiquidityChanged, totalSupply: BigInt | null): void {
  let id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let marketId = event.params.marketFactory.toHexString() + "-" + event.params.marketId.toString();
  let senderId = event.params.user.toHexString();

  let addLiquidityEntity = getOrCreateAddLiquidity(id, true, false);
  getOrCreateMarket(marketId);
  getOrCreateSender(senderId);

  addLiquidityEntity.transactionHash = event.transaction.hash.toHexString();
  addLiquidityEntity.timestamp = event.block.timestamp;
  addLiquidityEntity.collateral = bigIntToHexString(event.params.collateral);
  addLiquidityEntity.lpTokens = bigIntToHexString(event.params.lpTokens);
  addLiquidityEntity.marketId = marketId;
  addLiquidityEntity.sender = senderId;
  addLiquidityEntity.totalSupply = totalSupply;
  addLiquidityEntity.sharesReturned = event.params.sharesReturned;

  let sharesReturnedArray: BigInt[] = event.params.sharesReturned;
  let liquidityCollateralPerShare = liquidityCollateralPerShare(event.params.collateral, sharesReturnedArray);
  let addToInitialCost = true;
  for (let i = 0; i < sharesReturnedArray.length; i++) {
    if (sharesReturnedArray[i].toBigDecimal().div(SHARES_DECIMALS) >= DUST_POSITION_AMOUNT_BIG_DECIMAL) {
      handlePositionFromLiquidityChangedEvent(event, true, sharesReturnedArray[i], BigInt.fromI32(i), liquidityCollateralPerShare);

      if (addToInitialCost) {
        let logId = event.transaction.hash.toHexString() + "-" + BigInt.fromI32(i).toHexString() + "-" + event.params.collateral.toString();
        calculateInitialCostPerMarket(senderId, marketId, logId, event.params.collateral);
        addToInitialCost = false;
      }
    }
  }

  addLiquidityEntity.save();
}

function removeLiquidityEvent(event: LiquidityChanged, totalSupply: BigInt | null): void {
  let id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let marketId = event.params.marketFactory.toHexString() + "-" + event.params.marketId.toString();
  let senderId = event.params.user.toHexString();
  let removeLiquidityEntity = getOrCreateRemoveLiquidity(id, true, false);
  getOrCreateMarket(marketId);
  getOrCreateSender(senderId);
  getOrCreateOutcomes(id);

  removeLiquidityEntity.transactionHash = event.transaction.hash.toHexString();
  removeLiquidityEntity.timestamp = event.block.timestamp;
  removeLiquidityEntity.collateral = bigIntToHexString(event.params.collateral);
  removeLiquidityEntity.lpTokens = bigIntToHexString(event.params.lpTokens);
  removeLiquidityEntity.marketId = marketId;
  removeLiquidityEntity.sender = senderId;
  removeLiquidityEntity.totalSupply = totalSupply;
  removeLiquidityEntity.sharesReturned = event.params.sharesReturned;

  let sharesReturnedArray: BigInt[] = event.params.sharesReturned;
  let liquidityCollateralPerShare = liquidityCollateralPerShare(event.params.collateral, sharesReturnedArray);
  let addToInitialCost = true;
  for (let i = 0; i < sharesReturnedArray.length; i++) {
    if (sharesReturnedArray[i].toBigDecimal().div(SHARES_DECIMALS) >= DUST_POSITION_AMOUNT_BIG_DECIMAL) {
      handlePositionFromLiquidityChangedEvent(event, false, sharesReturnedArray[i], BigInt.fromI32(i), liquidityCollateralPerShare);

      if (addToInitialCost) {
        let logId = event.transaction.hash.toHexString() + "-" + BigInt.fromI32(i).toHexString() + "-" + event.params.collateral.toString();
        calculateInitialCostPerMarket(senderId, marketId, logId, event.params.collateral);
        addToInitialCost = false;
      }
    }
  }

  removeLiquidityEntity.save();
}

export function handleLiquidityChangedEvent(event: LiquidityChanged): void {
  let id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let marketId = event.params.marketFactory.toHexString() + "-" + event.params.marketId.toString();
  let senderId = event.params.user.toHexString();
  let liquidityEntity = getOrCreateLiquidity(id, true, false);
  getOrCreateMarket(marketId);
  let sender = getOrCreateSender(senderId);
  sender.totalLiquidity = sender.totalLiquidity + event.params.collateral;
  sender.save();

  let ammContractInstance = AmmFactoryContract.bind(event.address);
  let poolAddress = ammContractInstance.pools(event.params.marketFactory, event.params.marketId);
  let bPool = BPoolContract.bind(poolAddress);
  let totalSupply: BigInt | null = null;

  liquidityEntity.transactionHash = event.transaction.hash.toHexString();
  liquidityEntity.timestamp = event.block.timestamp;
  liquidityEntity.marketFactory = event.params.marketFactory.toHexString();
  liquidityEntity.marketId = marketId;
  liquidityEntity.sender = senderId;
  liquidityEntity.recipient = event.params.recipient.toHexString();
  liquidityEntity.collateral = bigIntToHexString(event.params.collateral);
  liquidityEntity.lpTokens = bigIntToHexString(event.params.lpTokens);
  liquidityEntity.sharesReturned = event.params.sharesReturned;

  let tryTotalSupply = bPool.try_totalSupply();

  if (!tryTotalSupply.reverted) {
    totalSupply = tryTotalSupply.value;
  }
  liquidityEntity.totalSupply = totalSupply;

  liquidityEntity.save();

  if (bigIntToHexString(event.params.collateral).substr(0, 1) == "-") {
    addLiquidityEvent(event, totalSupply);
  } else {
    removeLiquidityEvent(event, totalSupply);
  }
}

export function handleSharesSwappedEvent(event: SharesSwapped): void {
  let id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let marketId = event.params.marketFactory.toHexString() + "-" + event.params.marketId.toString();
  let senderId = event.params.user.toHexString();
  let tradeEntity = getOrCreateTrade(id, true, false);
  getOrCreateMarket(marketId);
  getOrCreateSender(senderId);

  tradeEntity.marketFactory = event.params.marketFactory.toHexString();
  tradeEntity.marketId = marketId;
  tradeEntity.user = senderId;
  tradeEntity.sender = senderId;
  tradeEntity.outcome = bigIntToHexString(event.params.outcome);
  tradeEntity.collateral = bigIntToHexString(event.params.collateral);
  tradeEntity.shares = bigIntToHexString(event.params.shares);
  tradeEntity.price = event.params.price.toBigDecimal().div(BigInt.fromI32(10).pow(18).toBigDecimal());

  tradeEntity.transactionHash = event.transaction.hash.toHexString();
  tradeEntity.timestamp = event.block.timestamp;

  let logId = event.transaction.hash.toHexString() + "-" + event.params.outcome.toHexString() + "-" + event.params.collateral.toString();
  calculateInitialCostPerMarket(senderId, marketId, logId, event.params.collateral);

  handlePositionFromTradeEvent(event);

  tradeEntity.save();
}
