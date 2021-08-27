import { ClaimedFees, ClaimedProceeds } from "../../generated/schema";

export function getOrCreateClaimedProceeds (
  id: string,
  createIfNotFound: boolean = true,
  save: boolean = true
): ClaimedProceeds {
  let entity = ClaimedProceeds.load(id);

  if (entity == null && createIfNotFound) {
    entity = new ClaimedProceeds(id);

    if (save) {
      entity.save();
    }
  }

  return entity as ClaimedProceeds;
}

export function getOrCreateClaimedFees (
  id: string,
  createIfNotFound: boolean = true,
  save: boolean = true
): ClaimedFees {
  let entity = ClaimedFees.load(id);

  if (entity == null && createIfNotFound) {
    entity = new ClaimedFees(id);

    if (save) {
      entity.save();
    }
  }

  return entity as ClaimedFees;
}