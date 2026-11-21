import { noise1, rand01 } from '../../shared/math';
import type { GenerationContext, WorldGenerator } from './types';

const REGION_WIDTH = 52;
const SALT = 0x67a9e1;

/**
 * Builds sparse drainage channels independently from chunk boundaries. Each
 * channel follows global coordinates, crosses the soil/stone boundary and
 * ends at a deterministic depth.
 */
export class GravelVeinGenerator implements WorldGenerator {
  readonly name = 'surface-to-depth-gravel-drainage';

  generate(context: GenerationContext) {
    if (context.generationVersion < 5) return;
    for (let x = 0; x < context.width; x++) {
      const gx = context.globalX(x);
      const homeRegion = Math.floor(gx / REGION_WIDTH);
      for (let region = homeRegion - 1; region <= homeRegion + 1; region++) {
        if (rand01(region, 1, context.seed ^ SALT) < 0.42) continue;
        const source = region * REGION_WIDTH + 7 +
          Math.floor(rand01(region, 2, context.seed ^ SALT) * (REGION_WIDTH - 14));
        const exposed = rand01(region, 3, context.seed ^ SALT) > 0.8;
        const startDepth = exposed ? 0 : 4 + Math.floor(rand01(region, 4, context.seed ^ SALT) * 3);
        const endDepth = 62 + Math.floor(rand01(region, 5, context.seed ^ SALT) * 100);
        const firstY = Math.max(context.startY, context.surface[x] + startDepth);
        const lastY = Math.min(context.endY, context.surface[x] + endDepth, context.height - 4);
        for (let y = firstY; y < lastY; y++) {
          const depth = y - context.surface[x];
          const bend = (noise1(depth / 22 + region * 3.71, context.seed ^ SALT) - 0.5) * 11;
          const center = source + bend;
          const width = 1.15 + rand01(region, Math.floor(depth / 12), context.seed ^ 0x915b) * 1.35;
          if (Math.abs(gx - center) > width) continue;
          const current = context.get(x, y);
          if (current === context.keys.DIRT || current === context.keys.STONE || current === context.keys.DEEP ||
            (exposed && depth === 0 && current === context.keys.GRASS)) context.set(x, y, context.keys.GRAVEL);
        }
      }
    }
  }
}
