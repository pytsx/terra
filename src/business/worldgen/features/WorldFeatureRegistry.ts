import { worldFeatureAssets, type WorldFeatureAsset } from '../../../assets';
import { B } from '../../catalog';

export interface ResolvedWorldFeature extends Omit<WorldFeatureAsset, 'trunk' | 'leaves' | 'replace'> {
  readonly trunk: number;
  readonly leaves: number;
  readonly replace: ReadonlySet<number>;
}

export class WorldFeatureRegistry {
  private readonly features = new Map<string, ResolvedWorldFeature>();
  constructor(assets: readonly WorldFeatureAsset[] = worldFeatureAssets) {
    for (const asset of assets) {
      const trunk = B[asset.trunk], leaves = B[asset.leaves];
      if (!asset.id || this.features.has(asset.id) || asset.strategy !== 'tree' || trunk === undefined || leaves === undefined ||
        !Number.isInteger(asset.minHeight) || asset.minHeight < 1 || !Number.isInteger(asset.heightVariation) ||
        asset.heightVariation < 1 || !asset.replace.length || asset.replace.some(block => B[block] === undefined))
        throw new Error(`Feature estrutural inválida: ${asset.id}`);
      this.features.set(asset.id, Object.freeze({ ...asset, trunk, leaves,
        replace: new Set(asset.replace.map(block => B[block])) }));
    }
  }
  get(id: string) { return this.features.get(id); }
  has(id: string) { return this.features.has(id); }
}

export const worldFeatureRegistry = new WorldFeatureRegistry();
