import stoneWeathering from './stone-weathering.json';
import grassGrowth from './grass-growth.json';
import grassDecay from './grass-decay.json';
import treeNaturalGrowth from './tree-natural-growth.json';
import treeSeedProduction from './tree-seed-production.json';
import type { TransformationAsset } from './types';
import { packs } from '../packs/generated';

import farmRule0 from './wheat.ripen.json';
import farmRule1 from './wheat.sprout.json';
import farmRule2 from './wheat.wilt.json';
import farmRule3 from './wheat.recover.json';
import farmRule4 from './soil.recover.json';
export const transformationAssets = Object.freeze([
  farmRule0, farmRule1, farmRule2, farmRule3, farmRule4,
  stoneWeathering, grassGrowth, grassDecay, treeNaturalGrowth, treeSeedProduction,
  ...packs.flatMap(pack => pack.transformations ?? []),
] as readonly TransformationAsset[]);
export type { TransformationAsset, TransformationCondition, TransformationOperator, TransformationProperty } from './types';
