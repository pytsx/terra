import oakTree from './oak-tree.json';
import type { WorldFeatureAsset } from './types';

export const worldFeatureAssets = Object.freeze([oakTree] as readonly WorldFeatureAsset[]);
export type { TreeStructureAsset, WorldFeatureAsset } from './types';
