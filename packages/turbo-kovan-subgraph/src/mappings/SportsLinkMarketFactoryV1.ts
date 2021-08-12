import { Address, BigInt } from "@graphprotocol/graph-ts";
import { getOrCreateMarket, getOrCreateSender } from "../helpers/AmmFactoryHelper";
import { getOrCreateTeamSportsMarket } from "../helpers/MarketFactoryHelper";
import {
  MarketCreated,
  MarketResolved,
  SettlementFeeClaimed,
  SportsLinkMarketFactory as SportsLinkMarketFactoryContract,
  WinningsClaimed
} from "../../generated/SportsLinkMarketFactoryV1/SportsLinkMarketFactory";
import { getOrCreateClaimedFees, getOrCreateClaimedProceeds } from "../helpers/AbstractMarketFactoryHelper";
import { bigIntToHexString } from "../utils";
import { handlePositionFromClaimWinningsEventV1 } from "../helpers/CommonHandlers";

function getShareTokens(contractAddress: Address, marketId: BigInt): Array<string> {
  let contract = SportsLinkMarketFactoryContract.bind(contractAddress);
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
  entity.overUnderTotal = event.params.score;
  entity.shareTokens = getShareTokens(event.address, event.params.id);

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

  handlePositionFromClaimWinningsEventV1(event);

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
