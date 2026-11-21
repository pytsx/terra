import { FractalNoise } from './noise';
import type { GenerationContext, WorldGenerator } from './types';

export class FloatingIslandGenerator implements WorldGenerator {
  readonly name = 'floating-islands';
  generate(context: GenerationContext) {
    const mask = new FractalNoise(context.seed ^ 0xf101, 4, 0.52);
    const shape = new FractalNoise(context.seed ^ 0xf202, 3, 0.52);
    for (let x = 10; x < context.width - 10; x++) {
      const gx = context.globalX(x);
      if (mask.sample(gx * 0.006) < 0.58 || context.rng.next() > 0.025) continue;
      const centerY = 20 + Math.round((shape.sample(gx * 0.014) + 1) * 8);
      const radius = context.rng.int(5, 13), thickness = context.rng.int(3, 7);
      for (let dx = -radius; dx <= radius; dx++) {
        const width = Math.sqrt(1 - (dx * dx) / (radius * radius));
        const top = centerY + Math.round(shape.sample((gx + dx) * 0.06) * 2);
        const bottom = top + Math.max(1, Math.round(thickness * width));
        if (context.landscape && bottom >= context.surface[x + dx] - 4) continue;
        for (let y = top; y <= bottom; y++) {
          const edge = Math.abs(dx) / radius + (y - top) / (thickness + 1);
          if (edge > 1.35) continue;
          context.set(x + dx, y, y === top ? context.keys.GRASS : y < top + 3 ? context.keys.DIRT : context.keys.STONE);
        }
      }
      x += radius * 2;
    }
  }
}
