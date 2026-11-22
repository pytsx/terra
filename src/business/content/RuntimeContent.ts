import type { Materials } from './Materials';
import type { WorldFeatureRegistry } from '../worldgen/features/WorldFeatureRegistry';
import type { EntityRegistry } from '../entities/EntityRegistry';
import type { RecipeBook } from '../craft/RecipeBook';
import type { TransformationRegistry } from '../simulation/TransformationRegistry';
import type { StationRegistry, ProcessingRecipeRegistry } from '../stations/StationRegistry';
import type { FuelDefinition } from '../stations/StationTypes';
import type { GenerationPipeline } from '../worldgen/types';

export interface RuntimeContent {
  /** Stable identity persisted with saves to reject incompatible catalogs safely. */
  readonly signature: string;
  readonly acceptsLegacySaves: boolean;
  readonly materials: Materials;
  readonly entities: EntityRegistry;
  readonly recipes: RecipeBook;
  readonly transformations: TransformationRegistry;
  readonly stations: StationRegistry;
  readonly processes: ProcessingRecipeRegistry;
  readonly fuels: Pick<ReadonlyMap<string, FuelDefinition>, 'get'>;
  readonly structures: WorldFeatureRegistry;
  readonly generation: { readonly biomes: NonNullable<ConstructorParameters<typeof import('../worldgen/Landscape').Landscape>[4]>; readonly terrain: GenerationPipeline; readonly modern: GenerationPipeline };
  readonly biomeRain: (name: string) => number;
}

/** Seal the bindings once. A running world always sees the same registries. */
export function bindRuntimeContent(registries: RuntimeContent): RuntimeContent {
  return Object.freeze({
    ...registries,
    generation: Object.freeze({ ...registries.generation }),
    fuels: Object.freeze({ get: registries.fuels.get.bind(registries.fuels) }),
  });
}
