import { B } from '../catalog';
import { FractalNoise } from './noise';
import type { GenerationContext, WorldGenerator } from './types';

export class TerrainDensityGenerator implements WorldGenerator {
  readonly name = 'three-dimensional-density';
  generate(context: GenerationContext) {
    const density = new FractalNoise(context.seed ^ 0x71a1, 4, 0.52);
    for (let x = 0; x < context.width; x++) {
      const gx = context.globalX(x);
      const surface = context.surface[x], climate = context.climate[x];
      const biome = context.landscape?.biome(x);
      const desert = biome ? biome === 'Dunas' : climate.temperature > 0.2 && climate.humidity < 0;
      for (let y = Math.max(surface, context.startY); y < context.endY; y++) {
        if (y >= context.height - 4) { context.set(x, y, B.BEDROCK); continue; }
        const depth = y - surface;
        if (biome === 'Serra rochosa' && depth < 7) context.set(x, y, B.STONE);
        else if (depth === 0) context.set(x, y, desert ? B.SAND : B.GRASS);
        else if (depth < (desert ? 10 : 7)) context.set(x, y, desert ? B.SAND : B.DIRT);
        else {
          const deepBoundary = 172 + density.sample(gx * 0.009, y * 0.008) * 8;
          context.set(x, y, y > deepBoundary ? B.DEEP : B.STONE);
        }
      }
    }
  }
}
