import type { TerrainMaterialFeature } from './types';

export const terrainMaterialFeature = Object.freeze({
  id: 'overworld-geology', strategy: 'terrain-density',
  air: 'AIR', bedrock: 'BEDROCK', surface: 'GRASS', soil: 'DIRT',
  desertSurface: 'SAND', desertSoil: 'SAND', rock: 'STONE', deepRock: 'DEEP',
  mountainBiome: 'Serra rochosa', desertBiome: 'Dunas',
  mountainRockDepth: 7, soilDepth: 7, desertSoilDepth: 10,
  bedrockDepth: 4, deepBoundary: 172,
} satisfies TerrainMaterialFeature);
