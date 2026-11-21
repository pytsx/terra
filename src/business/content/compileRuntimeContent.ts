import { RecipeBook, type Recipe } from '../craft/RecipeBook';
import { TransformationRegistry } from '../simulation/TransformationRegistry';
import { compileProduction, type ProductionDefinitions } from '../stations/StationRegistry';
import type { TransformationAsset } from '../../assets/transformations/types';
import { immutable } from '../../assets/immutable';
import { bindRuntimeContent, type RuntimeContent } from './RuntimeContent';

export interface SimulationDefinitions extends ProductionDefinitions {
  recipes: readonly Recipe[];
  transformations: readonly TransformationAsset[];
}

/** Compile mutable authoring inputs into a snapshot owned by this simulation. */
export function compileRuntimeContent(source: SimulationDefinitions,
  services: Pick<RuntimeContent, 'entities' | 'generation' | 'biomeRain' | 'structures'>): RuntimeContent {
  const snapshot = structuredClone(source);
  immutable(snapshot);
  const { stationRegistry, processingRecipes, fuels } = compileProduction(snapshot);
  return bindRuntimeContent({
    ...services,
    stations: stationRegistry, processes: processingRecipes, fuels,
    recipes: new RecipeBook(snapshot.recipes), transformations: new TransformationRegistry(snapshot.transformations, services.structures),
  });
}
