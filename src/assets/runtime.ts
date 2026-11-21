import { worldFeatureRegistry } from '../business/worldgen/features/WorldFeatureRegistry';
import { bindRuntimeContent } from '../business/content/RuntimeContent';
import { EntityRegistry } from '../business/entities/EntityRegistry';
import { transformationRegistry } from '../business/simulation/TransformationRegistry';
import { stationRegistry, processingRecipes, fuels } from '../business/stations/StationRegistry';
import { recipes } from '../business/craft/RecipeBook';
import { terrainPipeline, modernPipeline } from '../business/worldgen';
import { biomeRain } from './generation';

/** Adapter for the installed content and the original seed-only constructors. */
export const defaultContent = bindRuntimeContent({
  structures: worldFeatureRegistry, entities: EntityRegistry, recipes, transformations: transformationRegistry,
  stations: stationRegistry, processes: processingRecipes, fuels,
  generation: { terrain: terrainPipeline, modern: modernPipeline }, biomeRain,
});
