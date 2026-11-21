import { FractalNoise } from './noise';
import type { ResolvedTerrainMaterialFeature } from './features/types';
import type { GenerationContext, WorldGenerator } from './types';

export class TerrainDensityGenerator implements WorldGenerator {
  readonly name = 'three-dimensional-density';
  constructor(private readonly materials: ResolvedTerrainMaterialFeature) {}
  generate(context: GenerationContext) {
    const material = this.materials;
    const density = new FractalNoise(context.seed ^ 0x71a1, 4, 0.52);
    for (let x = 0; x < context.width; x++) {
      const gx = context.globalX(x);
      const surface = context.surface[x], climate = context.climate[x];
      const biome = context.landscape?.biome(x);
      const desert = biome ? biome === material.desertBiome : climate.temperature > 0.2 && climate.humidity < 0;
      for (let y = Math.max(surface, context.startY); y < context.endY; y++) {
        if (y >= context.height - material.bedrockDepth) { context.set(x, y, material.bedrock); continue; }
        const depth = y - surface;
        if (biome === material.mountainBiome && depth < material.mountainRockDepth) context.set(x, y, material.rock);
        else if (depth === 0) context.set(x, y, desert ? material.desertSurface : material.surface);
        else if (depth < (desert ? material.desertSoilDepth : material.soilDepth))
          context.set(x, y, desert ? material.desertSoil : material.soil);
        else {
          const deepBoundary = material.deepBoundary + density.sample(gx * 0.009, y * 0.008) * 8;
          context.set(x, y, y > deepBoundary ? material.deepRock : material.rock);
        }
      }
    }
  }
}
