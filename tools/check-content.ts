import { terrainPipeline } from '../src/business/worldgen';
import { defaultContent } from '../src/assets/runtime';
import { packs } from '../src/assets/packs/generated';
import { B } from '../src/business/catalog';
import { baseBiomes, biomeVariants } from '../src/assets/generation';

const biomes = new Set([...baseBiomes, ...biomeVariants].map(b => b.name));
for (const pack of packs) {
  for (const species of pack.species ?? []) {
    for (const block of species.config.substrate)
      if (!Object.hasOwn(B, block)) throw new Error(pack.id + ': substrato desconhecido ' + block);
    for (const biome of species.config.spawn.biomes)
      if (!biomes.has(biome)) throw new Error(pack.id + ': bioma desconhecido ' + biome);
    for (const behavior of species.behaviors)
      if (behavior.action === 'flee' && !defaultContent.entities.asset(behavior.target))
        throw new Error(pack.id + ': espécie desconhecida ' + behavior.target);
  }
  for (const recipe of pack.recipes ?? [])
    if (recipe.station && defaultContent.stations.get(recipe.station)?.mode !== 'crafting')
      throw new Error(pack.id + ': bancada desconhecida ' + recipe.station);
}

console.log('Conteúdo validado', {
  generationStages: terrainPipeline.stages.length,
  transformations: defaultContent.transformations.rules.length,
  stations: defaultContent.stations.values().length,
  recipes: defaultContent.recipes.recipes.length,
});
