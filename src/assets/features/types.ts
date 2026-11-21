export interface TreeStructureAsset {
  id: string;
  strategy: 'tree';
  trunk: string;
  leaves: string;
  replace: string[];
  minHeight: number;
  heightVariation: number;
  canopy: 'broadleaf' | 'conifer';
}
export type WorldFeatureAsset = TreeStructureAsset;
