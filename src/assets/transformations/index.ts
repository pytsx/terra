import stoneWeathering from './stone-weathering.json';
import grassGrowth from './grass-growth.json';
import grassDecay from './grass-decay.json';
import treeNaturalGrowth from './tree-natural-growth.json';
import type { TransformationAsset } from './types';

export const transformationAssets = Object.freeze([
  stoneWeathering, grassGrowth, grassDecay, treeNaturalGrowth,
] as readonly TransformationAsset[]);
export type { TransformationAsset, TransformationCondition, TransformationOperator, TransformationProperty } from './types';
