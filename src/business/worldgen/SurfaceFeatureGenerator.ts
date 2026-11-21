import { B } from '../catalog';
import type { GenerationContext, WorldGenerator } from './types';

export class SurfaceFeatureGenerator implements WorldGenerator {
  readonly name = 'climate-surface-features';
  generate(context: GenerationContext) {
    if (context.landscape) return context.landscape.plant(context);
    let previousTree = -40;
    for (let x = 8; x < context.width - 9; x++) {
      const gx = context.globalX(x);
      const y = context.surface[x], climate = context.climate[x];
      if (context.get(x, y) !== B.GRASS || climate.humidity < -0.35 ||
        x - previousTree < 7 || context.rng.next() > 0.1 || Math.abs(gx - (context.originX + context.spawnX)) < 8) continue;
      const height = context.rng.int(4, 7);
      for (let j = 1; j <= height; j++) context.set(x, y - j, B.WOOD);
      for (let dy = -2; dy <= 1; dy++) for (let dx = -3; dx <= 3; dx++) {
        if (dx * dx * 0.5 + dy * dy * 1.2 > 5.5 || context.rng.next() < 0.08) continue;
        if (context.get(x + dx, y - height + dy) === B.AIR) context.set(x + dx, y - height + dy, B.LEAF);
      }
      previousTree = x;
    }
  }
}
