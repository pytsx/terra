import { FractalNoise } from './noise';
import type { GenerationContext, WorldGenerator } from './types';

export class AquiferGenerator implements WorldGenerator {
  readonly name = 'local-aquifers';
  generate(context: GenerationContext) {
    const levels = new FractalNoise(context.seed ^ 0xa911, 3, 0.55);
    const fluid = new FractalNoise(context.seed ^ 0xa922, 2, 0.5);
    for (let x = 0; x < context.width; x++) {
      const gx = context.globalX(x);
      const wet = fluid.sample(gx * 0.006, 11.7);
      if (wet < 0.28) continue;
      const localLevel = 164 + Math.round(levels.sample(gx * 0.006) * 10);
      for (let y = Math.max(context.startY, context.surface[x] + 30, localLevel);
        y < Math.min(context.endY, context.height - 4); y++) {
        if (context.get(x, y) !== context.keys.AIR) continue;
        const lava = y > context.height - 20 && fluid.sample(gx * 0.025, y * 0.03) > 0.12;
        context.set(x, y, lava ? context.keys.LAVA : context.keys.WATER);
      }
    }
  }
}
