import { CryptoMarket, MmaMarket, TeamSportsMarket } from "../../generated/schema";

export function getOrCreateTeamSportsMarket (
  id: string,
  createIfNotFound: boolean = true,
  save: boolean = true
): TeamSportsMarket {
  let entity = TeamSportsMarket.load(id);

  if (entity == null && createIfNotFound) {
    entity = new TeamSportsMarket(id);
    let splitId = id.split("-");
    let MARKET_FACTORY_ID = 0;
    let MARKET_INDEX = 1;
    entity.marketFactory = splitId[MARKET_FACTORY_ID];
    entity.marketIndex = splitId[MARKET_INDEX];

    if (save) {
      entity.save();
    }
  }

  return entity as TeamSportsMarket;
}

export function getOrCreateMmaMarket (
  id: string,
  createIfNotFound: boolean = true,
  save: boolean = true
): MmaMarket {
  let entity = MmaMarket.load(id);

  if (entity == null && createIfNotFound) {
    entity = new MmaMarket(id);
    let splitId = id.split("-");
    let MARKET_FACTORY_ID = 0;
    let MARKET_INDEX = 1;
    entity.marketFactory = splitId[MARKET_FACTORY_ID];
    entity.marketIndex = splitId[MARKET_INDEX];

    if (save) {
      entity.save();
    }
  }

  return entity as MmaMarket;
}

export function getOrCreateCryptoMarket (
  id: string,
  createIfNotFound: boolean = true,
  save: boolean = true
): CryptoMarket {
  let entity = CryptoMarket.load(id);

  if (entity == null && createIfNotFound) {
    entity = new CryptoMarket(id);
    let splitId = id.split("-");
    let MARKET_FACTORY_ID = 0;
    let MARKET_INDEX = 1;
    entity.marketFactory = splitId[MARKET_FACTORY_ID];
    entity.marketIndex = splitId[MARKET_INDEX];

    if (save) {
      entity.save();
    }
  }

  return entity as CryptoMarket;
}