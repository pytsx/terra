import { RecipeBook, type Recipe } from '../craft/RecipeBook';
import { TransformationRegistry } from '../simulation/TransformationRegistry';
import { compileProduction, type ProductionDefinitions } from '../stations/StationRegistry';
import type { TransformationAsset } from '../../assets/transformations/types';
import { immutable } from '../../assets/immutable';
import { bindRuntimeContent, type RuntimeContent } from './RuntimeContent';

export interface SimulationDefinitions extends ProductionDefinitions {
  recipes: readonly Recipe[];
  transformations: readonly TransformationAsset[];
  content?: { readonly id: string; readonly version: number; readonly acceptsLegacySaves?: boolean };
}

function contentSignature(source: SimulationDefinitions, services: Pick<RuntimeContent, 'materials' | 'entities' | 'generation'>) {
  const descriptor = JSON.stringify({
    id: source.content?.id ?? 'anonymous', version: source.content?.version ?? 1, source,
    materials: Object.keys(services.materials.items).sort(), blocks: Object.keys(services.materials.blocks).sort(),
    entities: services.entities.ids().slice().sort(), biomes: services.generation.biomes,
  });
  let hash = 2166136261;
  for (let i = 0; i < descriptor.length; i++) hash = Math.imul(hash ^ descriptor.charCodeAt(i), 16777619);
  return `${source.content?.id ?? 'content'}@${source.content?.version ?? 1}:${(hash >>> 0).toString(36)}`;
}

/** Compile mutable authoring inputs into a snapshot owned by this simulation. */
export function compileRuntimeContent(source: SimulationDefinitions,
  services: Pick<RuntimeContent, 'materials' | 'entities' | 'generation' | 'biomeRain' | 'structures'>): RuntimeContent {
  const snapshot = structuredClone(source);
  immutable(snapshot);
  const { stationRegistry, processingRecipes, fuels } = compileProduction(snapshot, services.materials);
  return bindRuntimeContent({
    ...services,
    signature: contentSignature(snapshot, services), acceptsLegacySaves: source.content?.acceptsLegacySaves === true,
    stations: stationRegistry, processes: processingRecipes, fuels,
    recipes: new RecipeBook(snapshot.recipes, services.materials), transformations: new TransformationRegistry(snapshot.transformations, services.structures, services.materials),
  });
}
