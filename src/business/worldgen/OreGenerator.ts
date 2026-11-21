import { B } from '../catalog';
import { FractalNoise } from './noise';
import type { GenerationContext, WorldGenerator } from './types';

const deposits = [
  { block: B.COAL, min: 8, max: 76, rarity: 0.0052, radius: 3, salt: 0x0c01 },
  { block: B.COPPER, min: 16, max: 94, rarity: 0.0034, radius: 2, salt: 0x0c02 },
  { block: B.IRON, min: 28, max: 118, rarity: 0.0023, radius: 2, salt: 0x0c05 },
  { block: B.GOLD, min: 82, max: 170, rarity: 0.00065, radius: 2, salt: 0x0c03 },
  { block: B.CRYSTAL, min: 124, max: 196, rarity: 0.00022, radius: 1, salt: 0x0c04 },
] as const;

export class OreGenerator implements WorldGenerator {
  readonly name = 'depth-aware-ore-veins';
  generate(context: GenerationContext) {
    for (const deposit of deposits) {
      const region = new FractalNoise(context.seed ^ deposit.salt, 3, 0.52);
      const attempts = Math.max(1, Math.round(context.width * context.height * deposit.rarity));
      for (let i = 0; i < attempts; i++) {
        const x = context.rng.int(3, context.width - 4), gx = context.globalX(x);
        if (region.sample(gx * 0.004, deposit.block * 0.13) < 0.12) continue;
        const depth = context.rng.int(deposit.min, deposit.max);
        const y = context.surface[x] + depth;
        if (y >= context.height - 5) continue;
        const center = (deposit.min + deposit.max) / 2;
        const halfRange = (deposit.max - deposit.min) / 2;
        if (context.rng.next() > 1 - Math.abs(depth - center) / halfRange) continue;
        const radius = context.rng.int(1, deposit.radius);
        for (let oy = -radius; oy <= radius; oy++) for (let ox = -radius; ox <= radius; ox++) {
          if (ox * ox + oy * oy > radius * radius || context.rng.next() < 0.3) continue;
          const current = context.get(x + ox, y + oy);
          const hostMatches = deposit.block === B.CRYSTAL || deposit.block === B.GOLD || deposit.block === B.IRON
            ? current === B.DEEP : current === B.STONE || current === B.DEEP;
          if (hostMatches) context.set(x + ox, y + oy, deposit.block);
        }
      }
    }
  }
}
