import { RNG } from '../../shared/math';
import { AquiferGenerator } from './AquiferGenerator';
import { CaveGenerator } from './CaveGenerator';
import { ClimateGenerator } from './ClimateGenerator';
import { FloatingIslandGenerator } from './FloatingIslandGenerator';
import { GravelVeinGenerator } from './GravelVeinGenerator';
import { OreGenerator } from './OreGenerator';
import { SpawnGenerator } from './SpawnGenerator';
import { SurfaceFeatureGenerator } from './SurfaceFeatureGenerator';
import { TerrainDensityGenerator } from './TerrainDensityGenerator';
import { GenerationPipeline, type ClimateSample, type GenerationContext } from './types';

export const climateGenerator = new ClimateGenerator();
export const terrainPipeline = new GenerationPipeline([
  new TerrainDensityGenerator(),
  new GravelVeinGenerator(),
  new CaveGenerator(),
  new AquiferGenerator(),
  new OreGenerator(),
  new FloatingIslandGenerator(),
  new SurfaceFeatureGenerator(),
  new SpawnGenerator(),
]);
export const modernPipeline = new GenerationPipeline([climateGenerator, ...terrainPipeline.stages]);

export function createGenerationContext(
  input: Omit<GenerationContext, 'climate' | 'rng' | 'startY' | 'endY' | 'generationVersion'> &
    { generationVersion?: number },
  rngSeed = input.seed,
): GenerationContext {
  return {
    ...input,
    generationVersion: input.generationVersion ?? 5,
    startY: 0, endY: input.height,
    climate: Array.from({ length: input.width }, (): ClimateSample => ({
      continentalness: 0, erosion: 0, weirdness: 0, peaksValleys: 0, temperature: 0, humidity: 0,
    })),
    rng: new RNG(rngSeed),
  };
}
export type { GenerationContext, WorldGenerator, ClimateSample } from './types';
