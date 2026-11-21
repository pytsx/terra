import oakTree from './oak-tree.json';
import type { WorldFeatureAsset } from './types';
import { packs } from '../packs/generated';

export const worldFeatureAssets = Object.freeze([oakTree, ...packs.flatMap(p => p.structures ?? [])] as readonly WorldFeatureAsset[]);
export type { TreeStructureAsset, WorldFeatureAsset } from './types';
