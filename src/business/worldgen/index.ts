import { RNG } from '../../shared/math';
import { CURRENT_GENERATION } from '../catalog';
import { scatterAssets, oreDepositFeatures, treeFeatures, terrainMaterialFeature } from '../../assets/generation';
import { compileSurfaceScatter } from './SurfaceScatter';
import { AquiferGenerator } from './AquiferGenerator';
import { CaveGenerator } from './CaveGenerator';
import { ClimateGenerator } from './ClimateGenerator';
import { FloatingIslandGenerator } from './FloatingIslandGenerator';
import { GravelVeinGenerator } from './GravelVeinGenerator';
import { OreGenerator } from './OreGenerator';
import { SpawnGenerator } from './SpawnGenerator';
import { SurfaceFeatureGenerator } from './SurfaceFeatureGenerator';
import { TerrainDensityGenerator } from './TerrainDensityGenerator';
import { FeatureRegistry } from './features/FeatureRegistry';
import { GenerationPipeline, type ClimateSample, type GenerationContext } from './types';

export const climateGenerator = new ClimateGenerator();
export const generationFeatures = new FeatureRegistry();
export const resolvedOreDeposits = generationFeatures.ore(oreDepositFeatures);
export const resolvedTrees = generationFeatures.trees(treeFeatures);
export const resolvedTerrainMaterials = generationFeatures.terrain(terrainMaterialFeature);
export const terrainPipeline = new GenerationPipeline([
  new TerrainDensityGenerator(resolvedTerrainMaterials),
  new GravelVeinGenerator(),
  new CaveGenerator(),
  new AquiferGenerator(),
  new OreGenerator(resolvedOreDeposits),
  new FloatingIslandGenerator(),
  new SurfaceFeatureGenerator(resolvedTrees, undefined, undefined, compileSurfaceScatter(scatterAssets)),
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
    generationVersion: input.generationVersion ?? CURRENT_GENERATION,
    startY: 0, endY: input.height,
    climate: Array.from({ length: input.width }, (): ClimateSample => ({
      continentalness: 0, erosion: 0, weirdness: 0, peaksValleys: 0, temperature: 0, humidity: 0,
    })),
    rng: new RNG(rngSeed),
  };
}
export type { GenerationContext, WorldGenerator, ClimateSample } from './types';
