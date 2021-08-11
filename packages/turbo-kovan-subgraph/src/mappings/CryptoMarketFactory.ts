import { Address, BigInt } from "@graphprotocol/graph-ts";
import { getOrCreateMarket, getOrCreateSender } from "../helpers/AmmFactoryHelper";
import { getOrCreateCryptoMarket } from "../helpers/MarketFactoryHelper";
import {
  CryptoMarketFactory as CryptoMarketFactoryContract,
  MarketCreated,
  MarketResolved,
  SettlementFeeClaimed,
  WinningsClaimed
} from "../../generated/CryptoMarketFactoryV2/CryptoMarketFactory";
import { getOrCreateClaimedFees, getOrCreateClaimedProceeds } from "../helpers/AbstractMarketFactoryHelper";
import { bigIntToHexString, SHARES_DECIMALS, USDC_DECIMALS, ZERO } from "../utils";
import {
  getOrCreateInitialCostPerMarket,
  getOrCreatePositionBalance
} from "../helpers/CommonHandlers";

function getShareTokens(contractAddress: Address, marketId: BigInt): Array<string> {
  let contract = CryptoMarketFactoryContract.bind(contractAddress);
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

function getInitialOdds(contractAddress: Address, marketId: BigInt): Array<BigInt> {
  let contract = CryptoMarketFactoryContract.bind(contractAddress);
  let tryGetMarket = contract.try_getMarket(marketId);
  let initialOdds: BigInt[] = new Array<BigInt>();
  if (!tryGetMarket.reverted) {
    initialOdds = tryGetMarket.value.initialOdds;
  }
  return initialOdds;
}

function getOutcomeId(contractAddress: Address, marketId: BigInt, shareToken: string): string {
  let shareTokens = getShareTokens(contractAddress, marketId);
  let outcomeId = BigInt.fromI32(shareTokens.indexOf(shareToken));
  return bigIntToHexString(outcomeId);
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
  entity.initialOdds = getInitialOdds(event.address, event.params.id);

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

  handlePositionFromClaimWinningsEventV2(event);

  entity.save();
}

export function handleSettlementFeeClaimedEvent(event: SettlementFeeClaimed): void {
  let id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let senderId = event.params.settlementAddress.toHexString();
  let entity = getOrCreateClaimedFees(id, true, false);
  getOrCreateSender(senderId);

  entity.collateral = bigIntToHexString(event.params.amount);
  entity.sender = senderId;
  entity.receiver = event.params.receiver.toHexString();
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.timestamp = event.block.timestamp;

  entity.save();
}

function handlePositionFromClaimWinningsEventV2(
  event: WinningsClaimed,
): void {
  let marketId = event.address.toHexString() + "-" + event.params.id.toString();
  let senderId = event.params.receiver.toHexString();
  let id = senderId + "-" + marketId + "-" + event.params.winningOutcome.toHexString();
  let positionBalanceEntity = getOrCreatePositionBalance(id, true, false);
  let initialCostPerMarketEntity = getOrCreateInitialCostPerMarket(id);
  getOrCreateMarket(marketId);
  getOrCreateSender(senderId);

  let logId = id + "-" + event.transaction.hash.toHexString();
  let log = positionBalanceEntity.log;
  if (log) {
    let wasAlreadySummed = log.includes(logId);
    if (!wasAlreadySummed) {
      log.push(logId);
      positionBalanceEntity.log = log

      let sharesBigInt = positionBalanceEntity.sharesBigInt - event.params.amount.abs();

      positionBalanceEntity.positionFromAddLiquidity = false;
      positionBalanceEntity.positionFromRemoveLiquidity = false;
      positionBalanceEntity.hasClaimed = true;
      positionBalanceEntity.transactionHash = event.transaction.hash.toHexString();
      positionBalanceEntity.timestamp = event.block.timestamp;
      positionBalanceEntity.outcomeId = event.params.winningOutcome.toHexString();
      positionBalanceEntity.marketId = marketId;
      positionBalanceEntity.market = marketId;
      positionBalanceEntity.senderId = senderId;
      positionBalanceEntity.sender = senderId;

      let initialCostBigDecimal = initialCostPerMarketEntity.sumOfInitialCost.toBigDecimal().div(USDC_DECIMALS);
      let absInitialCostBigDecimal = initialCostPerMarketEntity.sumOfInitialCost.abs().toBigDecimal().div(USDC_DECIMALS);
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
      positionBalanceEntity.initCostUsdBigDecimal = initialCostBigDecimal;
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
    }
  }
}
