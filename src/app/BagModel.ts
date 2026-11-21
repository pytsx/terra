import type { Expedition } from '../business';
import type { BagModel } from '../render';
export function buildBagModel(game: Expedition): BagModel {
  return { ...game.inventory, processing: game.stationModel, seed: game.world.seed, slot: game.slot, player: game.player };
}
