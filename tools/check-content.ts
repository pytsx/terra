import { terrainPipeline } from '../src/business/worldgen';
import { transformationRegistry } from '../src/business/simulation/TransformationRegistry';
import { stationRegistry } from '../src/business/stations/StationRegistry';
import { recipes } from '../src/business/craft/RecipeBook';
import { packs } from '../src/assets/packs/generated';
import { B } from '../src/business/catalog';
import { EntityRegistry } from '../src/business/entities/EntityRegistry';
import { baseBiomes, biomeVariants } from '../src/assets/generation';

const biomes = new Set([...baseBiomes, ...biomeVariants].map(b => b.name));
for (const pack of packs) {
  for (const species of pack.species ?? []) {
    for (const block of species.config.substrate)
      if (!Object.hasOwn(B, block)) throw new Error(pack.id + ': substrato desconhecido ' + block);
    for (const biome of species.config.spawn.biomes)
      if (!biomes.has(biome)) throw new Error(pack.id + ': bioma desconhecido ' + biome);
    for (const behavior of species.behaviors)
      if (behavior.action === 'flee' && !EntityRegistry.asset(behavior.target))
        throw new Error(pack.id + ': espécie desconhecida ' + behavior.target);
  }
  for (const recipe of pack.recipes ?? [])
    if (recipe.station && stationRegistry.get(recipe.station)?.mode !== 'crafting')
      throw new Error(pack.id + ': bancada desconhecida ' + recipe.station);
}

console.log('Conteúdo validado', {
  generationStages: terrainPipeline.stages.length,
  transformations: transformationRegistry.rules.length,
  stations: stationRegistry.values().length,
  recipes: recipes.recipes.length,
});
