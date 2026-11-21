import type { GenerationContext } from '../types';

export type BlockKey = string;

/** Declarative input: block names are resolved once, before generation starts. */
export interface FeatureSpecification {
  readonly sinceGeneration?: number;
  readonly id: string;
  readonly strategy: string;
}

export interface GenerationStrategy<T extends FeatureSpecification> {
  readonly name: string;
  generate(context: GenerationContext, features: readonly T[]): void;
}

export interface OreDepositFeature extends FeatureSpecification {
  readonly strategy: 'ore-vein';
  readonly block: BlockKey;
  readonly replace: readonly BlockKey[];
  readonly minDepth: number;
  readonly maxDepth: number;
  readonly rarity: number;
  readonly maxRadius: number;
  readonly salt: number;
}

export interface ResolvedOreDepositFeature extends Omit<OreDepositFeature, 'block' | 'replace'> {
  readonly block: number;
  readonly replace: ReadonlySet<number>;
}

export interface TreeFeature extends FeatureSpecification {
  readonly strategy: 'landscape-tree';
  readonly biomes: Readonly<Record<string, number>>;
  readonly trunk: BlockKey;
  readonly leaves: BlockKey;
  readonly replaceLeaves: readonly BlockKey[];
  readonly spacing: number;
  readonly minHeight: number;
  readonly heightVariation: number;
  readonly coniferBiomes: readonly string[];
}

export interface ResolvedTreeFeature extends Omit<TreeFeature, 'trunk' | 'leaves' | 'replaceLeaves' | 'coniferBiomes'> {
  readonly trunk: number;
  readonly leaves: number;
  readonly replaceLeaves: ReadonlySet<number>;
  readonly coniferBiomes: ReadonlySet<string>;
}

export interface TerrainMaterialFeature extends FeatureSpecification {
  readonly strategy: 'terrain-density';
  readonly air: BlockKey;
  readonly bedrock: BlockKey;
  readonly surface: BlockKey;
  readonly soil: BlockKey;
  readonly desertSurface: BlockKey;
  readonly desertSoil: BlockKey;
  readonly rock: BlockKey;
  readonly deepRock: BlockKey;
  readonly mountainBiome: string;
  readonly desertBiome: string;
  readonly mountainRockDepth: number;
  readonly soilDepth: number;
  readonly desertSoilDepth: number;
  readonly bedrockDepth: number;
  readonly deepBoundary: number;
}

type TerrainBlockFields = 'air' | 'bedrock' | 'surface' | 'soil' | 'desertSurface' | 'desertSoil' | 'rock' | 'deepRock';
export interface ResolvedTerrainMaterialFeature extends Omit<TerrainMaterialFeature, TerrainBlockFields> {
  readonly air: number;
  readonly bedrock: number;
  readonly surface: number;
  readonly soil: number;
  readonly desertSurface: number;
  readonly desertSoil: number;
  readonly rock: number;
  readonly deepRock: number;
}
