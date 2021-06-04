import {
  AddLiquidity,
  AmmFactory,
  Liquidity,
  Market,
  Outcomes,
  RemoveLiquidity,
  Sender,
  Trade
} from "../../generated/schema";

export function getOrCreateAmmFactory (
  id: string,
  createIfNotFound: boolean = true,
  save: boolean = true
): AmmFactory {
  let entity = AmmFactory.load(id);

  if (entity == null && createIfNotFound) {
    entity = new AmmFactory(id);

    if (save) {
      entity.save();
    }
  }

  return entity as AmmFactory;
}

export function getOrCreateSender (
  id: string,
  createIfNotFound: boolean = true,
  save: boolean = true
): Sender {
  let entity = Sender.load(id);

  if (entity == null && createIfNotFound) {
    entity = new Sender(id);

    if (save) {
      entity.save();
    }
  }

  return entity as Sender;
}

export function getOrCreateMarket (
  id: string,
  createIfNotFound: boolean = true,
  save: boolean = true
): Market {
  let entity = Market.load(id);

  if (entity == null && createIfNotFound) {
    entity = new Market(id);

    if (save) {
      entity.save();
    }
  }

  return entity as Market;
}

export function getOrCreateOutcomes (
  id: string,
  createIfNotFound: boolean = true,
  save: boolean = true
): Outcomes {
  let entity = Outcomes.load(id);

  if (entity == null && createIfNotFound) {
    entity = new Outcomes(id);

    if (save) {
      entity.save();
    }
  }

  return entity as Outcomes;
}

export function getOrCreateLiquidity (
  id: string,
  createIfNotFound: boolean = true,
  save: boolean = true
): Liquidity {
  let entity = Liquidity.load(id);

  if (entity == null && createIfNotFound) {
    entity = new Liquidity(id);

    if (save) {
      entity.save();
    }
  }

  return entity as Liquidity;
}

export function getOrCreateAddLiquidity (
  id: string,
  createIfNotFound: boolean = true,
  save: boolean = true
): AddLiquidity {
  let entity = AddLiquidity.load(id);

  if (entity == null && createIfNotFound) {
    entity = new AddLiquidity(id);

    if (save) {
      entity.save();
    }
  }

  return entity as AddLiquidity;
}

export function getOrCreateRemoveLiquidity (
  id: string,
  createIfNotFound: boolean = true,
  save: boolean = true
): RemoveLiquidity {
  let entity = RemoveLiquidity.load(id);

  if (entity == null && createIfNotFound) {
    entity = new RemoveLiquidity(id);

    if (save) {
      entity.save();
    }
  }

  return entity as RemoveLiquidity;
}

export function getOrCreateTrade (
  id: string,
  createIfNotFound: boolean = true,
  save: boolean = true
): Trade {
  let entity = Trade.load(id);

  if (entity == null && createIfNotFound) {
    entity = new Trade(id);

    if (save) {
      entity.save();
    }
  }

  return entity as Trade;
}
