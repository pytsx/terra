import type { OreDepositFeature } from './types';

export const oreDepositFeatures = Object.freeze([
  { id: 'coal', strategy: 'ore-vein', block: 'COAL', replace: ['STONE', 'DEEP'], minDepth: 8, maxDepth: 76, rarity: 0.0052, maxRadius: 3, salt: 0x0c01 },
  { id: 'copper', strategy: 'ore-vein', block: 'COPPER', replace: ['STONE', 'DEEP'], minDepth: 16, maxDepth: 94, rarity: 0.0034, maxRadius: 2, salt: 0x0c02 },
  { id: 'iron', strategy: 'ore-vein', block: 'IRON', replace: ['DEEP'], minDepth: 28, maxDepth: 118, rarity: 0.0023, maxRadius: 2, salt: 0x0c05 },
  { id: 'gold', strategy: 'ore-vein', block: 'GOLD', replace: ['DEEP'], minDepth: 82, maxDepth: 170, rarity: 0.00065, maxRadius: 2, salt: 0x0c03 },
  { id: 'crystal', strategy: 'ore-vein', block: 'CRYSTAL', replace: ['DEEP'], minDepth: 124, maxDepth: 196, rarity: 0.00022, maxRadius: 1, salt: 0x0c04 },
] satisfies readonly OreDepositFeature[]);
