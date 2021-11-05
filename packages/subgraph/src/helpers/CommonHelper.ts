import {
  InitialCostPerMarket,
  LiquidityPositionBalance,
  PositionBalance,
  SharesMinted,
  TotalVolumePerDay,
  TotalVolumePerMarketPerDay
} from "../../generated/schema";
import { ZERO } from "../utils";
import { BigDecimal, BigInt } from "@graphprotocol/graph-ts/index";

export function getOrCreatePositionBalance(
  id: string,
  createIfNotFound: boolean = true,
  save: boolean = true
): PositionBalance {
  let entity = PositionBalance.load(id);

  if (entity == null && createIfNotFound) {
    entity = new PositionBalance(id);
    entity.sharesBigInt = ZERO;
    entity.initCostUsdBigInt = ZERO;
    entity.payoutBigInt = ZERO;
    entity.log = new Array<string>();

    if (save) {
      entity.save();
    }
  }

  return entity as PositionBalance;
}

export function getOrCreateInitialCostPerMarket(
  id: string,
  createIfNotFound: boolean = true,
  save: boolean = true
): InitialCostPerMarket {
  let entity = InitialCostPerMarket.load(id);

  if (entity == null && createIfNotFound) {
    entity = new InitialCostPerMarket(id);
    entity.sumOfInitialCost = ZERO;
    entity.sumOfInitialCostBigDecimal = ZERO.toBigDecimal();
    entity.sharesFromTrades = ZERO;
    entity.sharesFromTradesBigDecimal = ZERO.toBigDecimal();
    entity.avgPrice = ZERO.toBigDecimal();
    entity.log = new Array<string>();

    if (save) {
      entity.save();
    }
  }

  return entity as InitialCostPerMarket;
}

export function getOrCreateLiquidityPositionBalance(
  id: string,
  createIfNotFound: boolean = true,
  save: boolean = true
): LiquidityPositionBalance {
  let entity = LiquidityPositionBalance.load(id);

  if (entity == null && createIfNotFound) {
    entity = new LiquidityPositionBalance(id);
    entity.addCollateral = ZERO;
    entity.addCollateralBigDecimal = ZERO.toBigDecimal();
    entity.removeCollateral = ZERO;
    entity.removeCollateralBigDecimal = ZERO.toBigDecimal();
    entity.log = new Array<string>();
    entity.sharesReturned = new Array<BigInt>();
    entity.avgPricePerOutcome = new Array<BigDecimal>();

    if (save) {
      entity.save();
    }
  }

  return entity as LiquidityPositionBalance;
}

export function getOrCreateSharesMinted(
  id: string,
  createIfNotFound: boolean = true,
  save: boolean = false
): SharesMinted {
  let entity = SharesMinted.load(id);

  if (entity == null && createIfNotFound) {
    entity = new SharesMinted(id);

    if (save) {
      entity.save();
    }
  }

  return entity as SharesMinted;
}

export function getOrCreateTotalVolumePerDay(
  id: string,
  createIfNotFound: boolean = true,
  save: boolean = true
): TotalVolumePerDay {
  let entity = TotalVolumePerDay.load(id);

  if (entity == null && createIfNotFound) {
    entity = new TotalVolumePerDay(id);
    let zeroBigDecimal = ZERO.toBigDecimal();
    entity.totalVolumeFromTrades = zeroBigDecimal;
    entity.totalVolumeFromBuy = zeroBigDecimal;
    entity.totalVolumeFromSell = zeroBigDecimal;
    entity.totalVolumeFromLiquidity = zeroBigDecimal;
    entity.totalVolumeFromAddLiquidity = zeroBigDecimal;
    entity.totalVolumeFromRemoveLiquidity = zeroBigDecimal;

    if (save) {
      entity.save();
    }
  }

  return entity as TotalVolumePerDay;
}

export function getOrCreateTotalVolumePerMarketPerDay(
  id: string,
  createIfNotFound: boolean = true,
  save: boolean = true
): TotalVolumePerMarketPerDay {
  let entity = TotalVolumePerMarketPerDay.load(id);

  if (entity == null && createIfNotFound) {
    entity = new TotalVolumePerMarketPerDay(id);
    let zeroBigDecimal = ZERO.toBigDecimal();
    entity.totalVolumeFromTrades = zeroBigDecimal;
    entity.totalVolumeFromBuy = zeroBigDecimal;
    entity.totalVolumeFromSell = zeroBigDecimal;
    entity.totalVolumeFromLiquidity = zeroBigDecimal;
    entity.totalVolumeFromAddLiquidity = zeroBigDecimal;
    entity.totalVolumeFromRemoveLiquidity = zeroBigDecimal;

    if (save) {
      entity.save();
    }
  }

  return entity as TotalVolumePerMarketPerDay;
}
