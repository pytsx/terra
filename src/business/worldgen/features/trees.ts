import type { TreeFeature } from './types';

export const treeFeatures = Object.freeze([
  {
    id: 'temperate-and-conifer-trees', strategy: 'landscape-tree', trunk: 'WOOD', leaves: 'LEAF', replaceLeaves: ['AIR'],
    spacing: 6, minHeight: 5, heightVariation: 4,
    biomes: { 'Bosque de coníferas': 0.84, 'Floresta temperada': 0.94, Pradaria: 0.09 },
    coniferBiomes: ['Bosque de coníferas'],
  },
] satisfies readonly TreeFeature[]);
