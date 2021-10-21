import {
  CryptoMarket,
  GroupedMarket,
  MlbMarket,
  MmaMarket,
  NbaMarket,
  NflMarket,
  TeamSportsMarket,
} from "../../generated/schema";

export function getOrCreateTeamSportsMarket(
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

export function getOrCreateMmaMarket(id: string, createIfNotFound: boolean = true, save: boolean = true): MmaMarket {
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

export function getOrCreateCryptoMarket(
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

export function getOrCreateNflMarket(id: string, createIfNotFound: boolean = true, save: boolean = true): NflMarket {
  let entity = NflMarket.load(id);

  if (entity == null && createIfNotFound) {
    entity = new NflMarket(id);
    let splitId = id.split("-");
    let MARKET_FACTORY_ID = 0;
    let MARKET_INDEX = 1;
    entity.marketFactory = splitId[MARKET_FACTORY_ID];
    entity.marketIndex = splitId[MARKET_INDEX];

    if (save) {
      entity.save();
    }
  }

  return entity as NflMarket;
}

export function getOrCreateMlbMarket(id: string, createIfNotFound: boolean = true, save: boolean = true): MlbMarket {
  let entity = MlbMarket.load(id);

  if (entity == null && createIfNotFound) {
    entity = new MlbMarket(id);
    let splitId = id.split("-");
    let MARKET_FACTORY_ID = 0;
    let MARKET_INDEX = 1;
    entity.marketFactory = splitId[MARKET_FACTORY_ID];
    entity.marketIndex = splitId[MARKET_INDEX];

    if (save) {
      entity.save();
    }
  }

  return entity as MlbMarket;
}

export function getOrCreateNbaMarket(id: string, createIfNotFound: boolean = true, save: boolean = true): NbaMarket {
  let entity = NbaMarket.load(id);

  if (entity == null && createIfNotFound) {
    entity = new NbaMarket(id);
    let splitId = id.split("-");
    let MARKET_FACTORY_ID = 0;
    let MARKET_INDEX = 1;
    entity.marketFactory = splitId[MARKET_FACTORY_ID];
    entity.marketIndex = splitId[MARKET_INDEX];

    if (save) {
      entity.save();
    }
  }

  return entity as NbaMarket;
}

export function getOrCreateGroupedMarket(
  id: string,
  createIfNotFound: boolean = true,
  save: boolean = true
): GroupedMarket {
  let entity = GroupedMarket.load(id);

  if (entity == null && createIfNotFound) {
    entity = new GroupedMarket(id);
    let splitId = id.split("-");
    let MARKET_FACTORY_ID = 0;
    let MARKET_INDEX = 1;
    entity.marketFactory = splitId[MARKET_FACTORY_ID];
    entity.marketIndex = splitId[MARKET_INDEX];

    if (save) {
      entity.save();
    }
  }

  return entity as GroupedMarket;
}
