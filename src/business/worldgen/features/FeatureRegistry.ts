import { B } from '../../catalog';
import type {
  BlockKey, OreDepositFeature, ResolvedOreDepositFeature, ResolvedTerrainMaterialFeature,
  ResolvedTreeFeature, TerrainMaterialFeature, TreeFeature,
} from './types';

function blockId(key: BlockKey, feature: string) {
  const id = B[key];
  if (id === undefined) throw new Error(`Feature ${feature}: bloco desconhecido ${key}`);
  return id;
}

function finite(value: number, label: string, feature: string) {
  if (!Number.isFinite(value)) throw new Error(`Feature ${feature}: ${label} inválido`);
}

/** Resolves asset keys and validates feature contracts at composition time. */
export class FeatureRegistry {
  private readonly ids = new Set<string>();

  private claim(id: string) {
    if (!id || this.ids.has(id)) throw new Error(`Feature duplicada ou sem id: ${id}`);
    this.ids.add(id);
  }

  ore(features: readonly OreDepositFeature[]): readonly ResolvedOreDepositFeature[] {
    return Object.freeze(features.map((feature) => {
      this.claim(feature.id);
      if (feature.strategy !== 'ore-vein') throw new Error(`Feature ${feature.id}: estratégia inválida`);
      finite(feature.minDepth, 'minDepth', feature.id);
      finite(feature.maxDepth, 'maxDepth', feature.id);
      finite(feature.rarity, 'rarity', feature.id);
      if (feature.minDepth < 0 || feature.maxDepth < feature.minDepth || feature.rarity <= 0 ||
        !Number.isInteger(feature.maxRadius) || feature.maxRadius < 1 || !feature.replace.length)
        throw new Error(`Feature ${feature.id}: depósito inválido`);
      return Object.freeze({
        ...feature,
        block: blockId(feature.block, feature.id),
        replace: new Set(feature.replace.map((key) => blockId(key, feature.id))),
      });
    }));
  }

  trees(features: readonly TreeFeature[]): readonly ResolvedTreeFeature[] {
    return Object.freeze(features.map((feature) => {
      this.claim(feature.id);
      if (feature.strategy !== 'landscape-tree') throw new Error(`Feature ${feature.id}: estratégia inválida`);
      if (!Number.isInteger(feature.spacing) || feature.spacing < 1 || !Number.isInteger(feature.minHeight) ||
        feature.minHeight < 1 || !Number.isInteger(feature.heightVariation) || feature.heightVariation < 1)
        throw new Error(`Feature ${feature.id}: árvore inválida`);
      for (const chance of Object.values(feature.biomes))
        if (!Number.isFinite(chance) || chance < 0 || chance > 1)
          throw new Error(`Feature ${feature.id}: chance de bioma inválida`);
      return Object.freeze({
        ...feature,
        trunk: blockId(feature.trunk, feature.id),
        leaves: blockId(feature.leaves, feature.id),
        replaceLeaves: new Set(feature.replaceLeaves.map((key) => blockId(key, feature.id))),
        coniferBiomes: new Set(feature.coniferBiomes),
      });
    }));
  }

  terrain(feature: TerrainMaterialFeature): ResolvedTerrainMaterialFeature {
    this.claim(feature.id);
    if (feature.strategy !== 'terrain-density' || feature.soilDepth < 1 || feature.desertSoilDepth < 1 ||
      feature.mountainRockDepth < 0 || feature.bedrockDepth < 1)
      throw new Error(`Feature ${feature.id}: materiais de terreno inválidos`);
    return Object.freeze({
      ...feature,
      air: blockId(feature.air, feature.id), bedrock: blockId(feature.bedrock, feature.id),
      surface: blockId(feature.surface, feature.id), soil: blockId(feature.soil, feature.id),
      desertSurface: blockId(feature.desertSurface, feature.id), desertSoil: blockId(feature.desertSoil, feature.id),
      rock: blockId(feature.rock, feature.id), deepRock: blockId(feature.deepRock, feature.id),
    });
  }
}
