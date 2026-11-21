import type { SimulationRegion } from './SimulationRegion';

export interface SpatialEntity {
  readonly dead: boolean;
  view(): { x: number; y: number; w: number; h: number };
}

/** High-priority simulation group: every active entity is updated every fixed step. */
export class EntityUpdateGroup<T extends SpatialEntity> {
  select(entities: readonly T[], region: SimulationRegion) {
    return entities.filter(entity => !entity.dead && region.intersects(entity.view()));
  }
}
