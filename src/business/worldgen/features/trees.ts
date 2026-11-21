import type { TreeFeature } from './types';
import oakTree from '../../../assets/features/oak-tree.json';

export const treeFeatures = Object.freeze([
  {
    id: 'temperate-and-conifer-trees', strategy: 'landscape-tree', trunk: oakTree.trunk, leaves: oakTree.leaves,
    replaceLeaves: oakTree.replace, spacing: 6, minHeight: oakTree.minHeight, heightVariation: oakTree.heightVariation,
    biomes: { 'Bosque de coníferas': 0.84, 'Floresta temperada': 0.94, Pradaria: 0.09 },
    coniferBiomes: ['Bosque de coníferas'],
  },
] satisfies readonly TreeFeature[]);
