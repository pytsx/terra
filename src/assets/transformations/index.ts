import stoneWeathering from './stone-weathering.json';
import grassGrowth from './grass-growth.json';
import grassDecay from './grass-decay.json';
import treeNaturalGrowth from './tree-natural-growth.json';
import treeSeedProduction from './tree-seed-production.json';
import type { TransformationAsset } from './types';

export const transformationAssets = Object.freeze([
  { id: 'wheat.ripen', source: 'WHEAT_SHOOT', eligibility: { natural: true, playerPlaced: true },
    conditions: { all: [{ property: 'environment.exposedToSky', operator: '==', value: true },
      { property: 'soil.moisture', operator: '>=', value: 0.2 }] },
    duration: { seconds: 40, mode: 'continuous' }, probability: 1, retry: 'on-condition-reset',
    action: { type: 'transformBlock', to: 'RIPE_WHEAT', preserve: ['waterVolume'] } },
  stoneWeathering, grassGrowth, grassDecay, treeNaturalGrowth, treeSeedProduction,
] as readonly TransformationAsset[]);
export type { TransformationAsset, TransformationCondition, TransformationOperator, TransformationProperty } from './types';
