import { FractalNoise } from './noise';
import type { GenerationStrategy, ResolvedOreDepositFeature } from './features/types';
import type { GenerationContext, WorldGenerator } from './types';

/** Spatial strategy for every ore configured in the feature registry. */
export class OreGenerator implements WorldGenerator, GenerationStrategy<ResolvedOreDepositFeature> {
  readonly name = 'depth-aware-ore-veins';
  constructor(private readonly deposits: readonly ResolvedOreDepositFeature[]) {}
  generate(context: GenerationContext, deposits = this.deposits) {
    for (const deposit of deposits) {
      if (context.generationVersion < (deposit.sinceGeneration ?? 1)) continue;
      const region = new FractalNoise(context.seed ^ deposit.salt, 3, 0.52);
      const attempts = Math.max(1, Math.round(context.width * context.height * deposit.rarity));
      for (let i = 0; i < attempts; i++) {
        const x = context.rng.int(3, context.width - 4), gx = context.globalX(x);
        if (region.sample(gx * 0.004, deposit.block * 0.13) < 0.12) continue;
        const depth = context.rng.int(deposit.minDepth, deposit.maxDepth);
        const y = context.surface[x] + depth;
        if (y >= context.height - 5) continue;
        const center = (deposit.minDepth + deposit.maxDepth) / 2;
        const halfRange = (deposit.maxDepth - deposit.minDepth) / 2;
        if (context.rng.next() > 1 - Math.abs(depth - center) / halfRange) continue;
        const radius = context.rng.int(1, deposit.maxRadius);
        for (let oy = -radius; oy <= radius; oy++) for (let ox = -radius; ox <= radius; ox++) {
          if (ox * ox + oy * oy > radius * radius || context.rng.next() < 0.3) continue;
          if (deposit.replace.has(context.get(x + ox, y + oy)))
            context.set(x + ox, y + oy, deposit.block);
        }
      }
    }
  }
}
