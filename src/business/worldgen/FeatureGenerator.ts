import { mixHash } from '../../shared/math';
import { TreeStructurePlanner, type FeaturePlacement } from './features/TreeStructurePlanner';
import { worldFeatureRegistry, type WorldFeatureRegistry } from './features/WorldFeatureRegistry';

export interface FeaturePlan {
  readonly id: string;
  readonly placements: readonly FeaturePlacement[];
  readonly replace: ReadonlySet<number>;
}

export class FeatureGenerator {
  private readonly trees = new TreeStructurePlanner();
  constructor(private readonly registry: WorldFeatureRegistry = worldFeatureRegistry) {}

  plan(id: string, x: number, y: number, seed: number, variant: number): FeaturePlan | undefined {
    const feature = this.registry.get(id);
    if (!feature) return;
    const height = feature.minHeight + mixHash(x, y, seed ^ variant) % feature.heightVariation;
    return { id, placements: this.trees.plan(x, y, height, feature.trunk, feature.leaves, feature.canopy),
      replace: feature.replace };
  }
}

export const featureGenerator = new FeatureGenerator();
