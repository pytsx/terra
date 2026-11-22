import { B, BLOCKS, ITEMS, BLOCK_SCRIPTS, ITEM_ASSETS } from '../business/catalog';
import { WorldFeatureRegistry } from '../business/worldgen/features/WorldFeatureRegistry';
import { compileRuntimeContent } from '../business/content/compileRuntimeContent';
import { EntityRegistry, type EntityFactory } from '../business/entities/EntityRegistry';
import { Cow } from '../business/entities/Cow';
import { Wolf } from '../business/entities/Wolf';
import { Slime } from '../business/entities/Slime';
import { Organism } from '../business/ecosystem/Organism';
import { terrainPipeline, modernPipeline } from '../business/worldgen';
import { biomeRain, baseBiomes, biomeVariants } from './generation';
import { production } from './production';
import { transformationAssets } from './transformations';
import { worldFeatureAssets } from './features';
import { modularEntities } from './index';
import { ecologicalEntities } from './entities/ecology';

export const installedMaterials = Object.freeze({
  keys: B, blocks: BLOCKS, items: ITEMS, blockScripts: BLOCK_SCRIPTS, itemAssets: ITEM_ASSETS,
});
export const worldFeatureRegistry = new WorldFeatureRegistry(worldFeatureAssets, installedMaterials.keys);
const entityFactories = new Map<string, EntityFactory>([
  ['slime', (x,y,seed) => new Slime(x,y,seed)], ['cow', (x,y,seed,baby) => new Cow(x,y,seed,baby)],
  ['wolf', (x,y) => new Wolf(x,y)],
]);
for (const [id,species] of Object.entries(ecologicalEntities)) entityFactories.set(id,(x,y,seed)=>new Organism(species,x,y,seed));
export const entityRegistry = new EntityRegistry(modularEntities, entityFactories, installedMaterials.keys);
/** Adapter for the installed content and the original seed-only constructors. */
export const defaultContent = compileRuntimeContent({ ...production, transformations: transformationAssets,
  content: { id: 'terra', version: 1, acceptsLegacySaves: true } }, {
  materials: installedMaterials, structures: worldFeatureRegistry, entities: entityRegistry,
  generation: { biomes: { baseBiomes, biomeVariants }, terrain: terrainPipeline, modern: modernPipeline }, biomeRain,
});
