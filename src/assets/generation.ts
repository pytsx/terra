import { packs } from './packs/generated';
import { immutable } from './immutable';
import biomes from './generation/biomes.json';
import { oreDepositFeatures as coreOres } from './generation/oreDeposits';
import { treeFeatures as coreTrees } from './generation/trees';
export const oreDepositFeatures = immutable([...coreOres, ...packs.flatMap(p => p.oreDeposits ?? [])]);
export const treeFeatures = immutable([...coreTrees, ...packs.flatMap(p => p.trees ?? [])]);
export { terrainMaterialFeature } from './generation/terrainMaterials';

export const scatterAssets = immutable(packs.flatMap(pack => pack.scatter ?? []));
export const biomeVariants = immutable(packs.flatMap(pack => pack.biomes ?? []));
export const baseBiomes = immutable(biomes);
const fallback = baseBiomes.at(-1);
if (!fallback || fallback.reliefAbove !== undefined || fallback.arid || fallback.forested ||
    new Set(baseBiomes.map(b => b.name)).size !== baseBiomes.length ||
    baseBiomes.some(b => !b.name || !(b.rain >= 0 && b.rain <= 1)))
  throw new Error('Biomas base precisam de nomes únicos, precipitação válida e um último bioma sem condição');
const rainByBiome = new Map(baseBiomes.map(b => [b.name, b.rain]));
for (const variant of biomeVariants) {
  if (!variant.name || rainByBiome.has(variant.name) || !baseBiomes.some(base => base.name === variant.parent) ||
      !Number.isFinite(variant.minHumidity) || !Number.isInteger(variant.sinceGeneration) || variant.sinceGeneration < 1 ||
      (variant.rain !== undefined && !(variant.rain >= 0 && variant.rain <= 1)))
    throw new Error('Variante de bioma inválida: ' + variant.name);
  rainByBiome.set(variant.name, variant.rain ?? rainByBiome.get(variant.parent)!);
}
export const biomeRain = (name: string) => rainByBiome.get(name) ?? 1;
