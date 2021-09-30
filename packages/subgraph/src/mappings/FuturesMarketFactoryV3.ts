import { Address, BigInt } from "@graphprotocol/graph-ts";
import { getOrCreateMarket, getOrCreateSender } from "../helpers/AmmFactoryHelper";
import { getOrCreateFuturesMarket } from "../helpers/MarketFactoryHelper";
import {
  FuturesMarketFactory as FuturesMarketFactoryContract,
  FuturesMarketFactory__getMarketResultValue0Struct,
  MarketCreated,
  MarketResolved,
  WinningsClaimed,
  SharesMinted
} from "../../generated/FuturesMarketFactoryV3/FuturesMarketFactory";
import { getOrCreateClaimedProceeds } from "../helpers/AbstractMarketFactoryHelper";
import { bigIntToHexString, SHARES_DECIMALS, USDC_DECIMALS, ZERO } from "../utils";
import {
  getOrCreateInitialCostPerMarket,
  getOrCreatePositionBalance,
  getOrCreateSharesMinted
} from "../helpers/CommonHelper";
import { GenericSharesMintedParams } from "../types";
import { handleGenericSharesMintedEvent } from "../helpers/CommonHandlers";

function getShareTokens(contractAddress: Address, marketId: BigInt): Array<string> {
  let contract = FuturesMarketFactoryContract.bind(contractAddress);
  let tryGetMarket = contract.try_getMarket(marketId);
  let rawShareTokens: Address[] = new Array<Address>();
  if (!tryGetMarket.reverted) {
    rawShareTokens = tryGetMarket.value.shareTokens;
  }
  let shareTokens: string[] = new Array<string>();
  for (let i = 0; i < rawShareTokens.length; i++) {
    shareTokens.push(rawShareTokens[i].toHexString());
  }

  return shareTokens;
}

function getOutcomeId(contractAddress: Address, marketId: BigInt, shareToken: string): string {
  let shareTokens = getShareTokens(contractAddress, marketId);
  let outcomeId = BigInt.fromI32(shareTokens.indexOf(shareToken));
  return bigIntToHexString(outcomeId);
}

function getMarket(contractAddress: Address, marketId: BigInt): FuturesMarketFactory__getMarketResultValue0Struct | null {
  let contract = FuturesMarketFactoryContract.bind(contractAddress);
  let tryGetMarket = contract.try_getMarket(marketId);
  let market: FuturesMarketFactory__getMarketResultValue0Struct | null = null;
  if (!tryGetMarket.reverted) {
    market = tryGetMarket.value;
  }
  return market;
}

function closeAllPositions(contractAddress: Address, marketIndex: BigInt, marketId: string, senderId: string): void {
  let shareTokens = getShareTokens(contractAddress, marketIndex);
  for (let i = 0; i < shareTokens.length; i++) {
    let id = senderId + "-" + marketId + "-" + bigIntToHexString(BigInt.fromI32(i));
    let entity = getOrCreatePositionBalance(id, false, false);
    if (entity) {
      entity.open = false;
      entity.save();
    }
  }
}

export function handleMarketCreatedEvent(event: MarketCreated): void {
  let marketId = event.address.toHexString() + "-" + event.params.id.toString();

  let entity = getOrCreateFuturesMarket(marketId, true, false);
  getOrCreateMarket(marketId);
  // let market = getMarket(event.address, event.params.id);

  entity.marketId = marketId;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.timestamp = event.block.timestamp;
  // entity.creator = market.creator.toHexString();
  // entity.estimatedStartTime = market.estimatedStartTime;
  // entity.endTime = market.endTime;
  // entity.marketType = BigInt.fromI32(market.marketType);
  // entity.eventId = market.eventId;
  // entity.homeTeamName = market.homeTeamName;
  // entity.homeTeamId = market.homeTeamId;
  // entity.awayTeamName = market.awayTeamName;
  // entity.awayTeamId = market.awayTeamId;
  // entity.overUnderTotal = market.score;
  entity.shareTokens = getShareTokens(event.address, event.params.id);
  entity.initialOdds = event.params.initialOdds;

  entity.save();
}

export function handleMarketResolvedEvent(event: MarketResolved): void {
  let marketId = event.address.toHexString() + "-" + event.params.id.toString();

  let entity = getOrCreateFuturesMarket(marketId, false, false);

  if (entity) {
    entity.winner = event.params.winner.toHexString();

    entity.save();
  }
}

// export function handleSettlementFeeClaimedEvent(event: SettlementFeeClaimed): void {
//   let id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
//   let senderId = event.params.settlementAddress.toHexString();
//   let entity = getOrCreateClaimedFees(id, true, false);
//   getOrCreateSender(senderId);
//
//   entity.collateral = bigIntToHexString(event.params.amount);
//   entity.sender = senderId;
//   entity.receiver = event.params.receiver.toHexString();
//   entity.transactionHash = event.transaction.hash.toHexString();
//   entity.timestamp = event.block.timestamp;
//
//   entity.save();
// }

export function handleWinningsClaimedEvent(event: WinningsClaimed): void {
  let id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let marketId = event.address.toHexString() + "-" + event.params.id.toString();
  let senderId = event.params.receiver.toHexString();
  let entity = getOrCreateClaimedProceeds(id, true, false);
  let shareTokenId = event.params.winningOutcome.toHexString();
  getOrCreateMarket(marketId);
  getOrCreateSender(senderId);

  entity.marketId = marketId;
  entity.sender = senderId;
  entity.shares = bigIntToHexString(event.params.amount);
  entity.payout = bigIntToHexString(event.params.payout);
  entity.outcome = shareTokenId;
  entity.outcomeId = getOutcomeId(event.address, event.params.id, shareTokenId);
  entity.fees = bigIntToHexString(event.params.settlementFee);
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.timestamp = event.block.timestamp;

  handlePositionFromClaimWinningsEvent(event);

  entity.save();
}

function handlePositionFromClaimWinningsEvent(event: WinningsClaimed): void {
  let marketId = event.address.toHexString() + "-" + event.params.id.toString();
  let senderId = event.params.receiver.toHexString();
  let outcomeId = getOutcomeId(event.address, event.params.id, event.params.winningOutcome.toHexString());
  let id = senderId + "-" + marketId + "-" + outcomeId;
  let positionBalanceEntity = getOrCreatePositionBalance(id, true, false);
  let initialCostPerMarketEntity = getOrCreateInitialCostPerMarket(id);
  getOrCreateMarket(marketId);
  getOrCreateSender(senderId);

  let sharesBigInt = positionBalanceEntity.sharesBigInt - event.params.amount.abs();

  positionBalanceEntity.positionFromAddLiquidity = false;
  positionBalanceEntity.positionFromRemoveLiquidity = false;
  positionBalanceEntity.hasClaimed = true;
  positionBalanceEntity.transactionHash = event.transaction.hash.toHexString();
  positionBalanceEntity.timestamp = event.block.timestamp;
  positionBalanceEntity.outcomeId = outcomeId;
  positionBalanceEntity.marketId = marketId;
  positionBalanceEntity.market = marketId;
  positionBalanceEntity.senderId = senderId;
  positionBalanceEntity.sender = senderId;

  let amountBigDecimal = event.params.amount.toBigDecimal().div(SHARES_DECIMALS);
  let absPayoutBigInt = positionBalanceEntity.payoutBigInt + event.params.payout.abs();
  let payoutBigDecimal = absPayoutBigInt.toBigDecimal().div(USDC_DECIMALS);
  let totalChangedUsd = event.params.payout - initialCostPerMarketEntity.sumOfInitialCost;
  let totalChangeUsdBigDecimal = totalChangedUsd.toBigDecimal().div(USDC_DECIMALS);
  positionBalanceEntity.shares = bigIntToHexString(event.params.amount);
  positionBalanceEntity.sharesBigInt = event.params.amount;
  positionBalanceEntity.sharesBigDecimal = amountBigDecimal;
  positionBalanceEntity.initCostUsd = bigIntToHexString(initialCostPerMarketEntity.sumOfInitialCost);
  positionBalanceEntity.initCostUsdBigInt = initialCostPerMarketEntity.sumOfInitialCost;
  positionBalanceEntity.initCostUsdBigDecimal = initialCostPerMarketEntity.sumOfInitialCostBigDecimal;
  positionBalanceEntity.payout = bigIntToHexString(absPayoutBigInt);
  positionBalanceEntity.payoutBigInt = absPayoutBigInt;
  positionBalanceEntity.payoutBigDecimal = payoutBigDecimal;
  positionBalanceEntity.totalChangeUsd = bigIntToHexString(totalChangedUsd);
  positionBalanceEntity.totalChangeUsdBigInt = totalChangedUsd;
  positionBalanceEntity.totalChangeUsdBigDecimal = totalChangeUsdBigDecimal;
  positionBalanceEntity.avgPrice = initialCostPerMarketEntity.avgPrice;
  positionBalanceEntity.settlementFee = bigIntToHexString(event.params.settlementFee);
  positionBalanceEntity.open = sharesBigInt > ZERO;

  positionBalanceEntity.save();

  closeAllPositions(event.address, event.params.id, marketId, senderId);
}

export function handleSharesMintedEvent(event: SharesMinted): void {
  let params: GenericSharesMintedParams = {
    hash: event.transaction.hash,
    timestamp: event.block.timestamp,
    marketFactory: event.address,
    marketIndex: event.params.id,
    amount: event.params.amount,
    receiver: event.params.receiver
  };
  handleGenericSharesMintedEvent(params);
}
