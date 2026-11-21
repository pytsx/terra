import { rand01 } from '../../../shared/math';
import type { GenerationContext } from '../types';
import type { GenerationStrategy, ResolvedTreeFeature } from '../features/types';

export class LandscapeTreeStrategy implements GenerationStrategy<ResolvedTreeFeature> {
  readonly name = 'landscape-tree';
  constructor(private readonly margin = 4) {}

  generate(context: GenerationContext, features: readonly ResolvedTreeFeature[]) {
    const landscape = context.landscape;
    if (!landscape) return;
    for (const feature of features) for (let x = -this.margin; x < context.width + this.margin; x++) {
      const gx = context.globalX(x), cell = Math.floor(gx / feature.spacing);
      if (gx !== cell * feature.spacing + Math.floor(rand01(cell, 3, context.seed) * (feature.spacing - 1))) continue;
      if (Math.abs(x - context.spawnX) < 8) continue;
      const biome = landscape.biome(x), conifer = feature.coniferBiomes.has(biome);
      if (rand01(cell, 4, context.seed) >= (feature.biomes[biome] ?? 0)) continue;
      const y = landscape.height(x);
      const height = (conifer ? feature.minHeight + 3 : feature.minHeight) +
        Math.floor(rand01(cell, 5, context.seed) * feature.heightVariation);
      if (y < context.startY || y - height - 2 >= context.endY) continue;
      for (let dy = 1; dy <= height; dy++) context.set(x, y - dy, feature.trunk);
      for (let dy = -2; dy <= (conifer ? 5 : 2); dy++) {
        const radius = conifer ? Math.floor((dy + 3) / 2) : 4 - Math.abs(dy);
        for (let dx = -radius; dx <= radius; dx++) {
          if (feature.replaceLeaves.has(context.get(x + dx, y - height + dy)))
            context.set(x + dx, y - height + dy, feature.leaves);
        }
      }
    }
  }
}
