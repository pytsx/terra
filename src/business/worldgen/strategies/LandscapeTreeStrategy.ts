import { rand01 } from '../../../shared/math';
import type { GenerationContext } from '../types';
import type { GenerationStrategy, ResolvedTreeFeature } from '../features/types';
import { TreeStructurePlanner } from '../features/TreeStructurePlanner';

export class LandscapeTreeStrategy implements GenerationStrategy<ResolvedTreeFeature> {
  readonly name = 'landscape-tree';
  private readonly planner = new TreeStructurePlanner();
  constructor(private readonly margin = 4) {}

  generate(context: GenerationContext, features: readonly ResolvedTreeFeature[]) {
    const landscape = context.landscape;
    if (!landscape) return;
    for (const feature of features) for (let x = -this.margin; x < context.width + this.margin; x++) {
      if (context.generationVersion < (feature.sinceGeneration ?? 1)) continue;
      const gx = context.globalX(x), cell = Math.floor(gx / feature.spacing);
      if (gx !== cell * feature.spacing + Math.floor(rand01(cell, 3, context.seed) * (feature.spacing - 1))) continue;
      if (Math.abs(x - context.spawnX) < 8) continue;
      const biome = landscape.biome(x), conifer = feature.coniferBiomes.has(biome);
      if (rand01(cell, 4, context.seed) >= (feature.biomes[biome] ?? 0)) continue;
      const y = landscape.height(x);
      const height = (conifer ? feature.minHeight + 3 : feature.minHeight) +
        Math.floor(rand01(cell, 5, context.seed) * feature.heightVariation);
      if (y < context.startY || y - height - 2 >= context.endY) continue;
      for (const placement of this.planner.plan(x, y - 1, height, feature.trunk, feature.leaves,
        conifer ? 'conifer' : 'broadleaf'))
        if (placement.block === feature.trunk || feature.replaceLeaves.has(context.get(placement.x, placement.y)))
          context.set(placement.x, placement.y, placement.block);
    }
  }
}
