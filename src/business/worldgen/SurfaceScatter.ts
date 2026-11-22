import { hashText, rand01 } from '../../shared/math';
import type { GenerationContext } from './types';
import type { SurfaceScatter } from '../content/ContentPack';

export function compileSurfaceScatter(assets: readonly SurfaceScatter[], keys: Readonly<Record<string, number>>) {
  const ids = new Set<string>();
  const rules = assets.map(rule => {
    if (!rule.id || ids.has(rule.id) || !Object.hasOwn(keys, rule.block) || !Object.hasOwn(keys, rule.substrate) ||
        !Number.isInteger(rule.sinceGeneration) || rule.sinceGeneration < 1 ||
        !Number.isFinite(rule.minHumidity) || !(rule.probability >= 0 && rule.probability <= 1))
      throw new Error('Distribuição de superfície inválida: ' + rule.id);
    ids.add(rule.id);
    return { ...rule, block: keys[rule.block], substrate: keys[rule.substrate], salt: hashText(rule.id) };
  });
  return (context: GenerationContext) => {
    for (const rule of rules) {
      if (context.generationVersion < rule.sinceGeneration) continue;
      for (let x = 0; x < context.width; x++) {
        const y = context.surface[x] - 1;
        if (y < context.startY || y >= context.endY || Math.abs(x - context.spawnX) < 8 ||
            context.climate[x].humidity < rule.minHumidity || context.get(x, y) !== context.keys.AIR ||
            context.get(x, y + 1) !== rule.substrate) continue;
        if (rand01(context.globalX(x), rule.salt, context.seed) < rule.probability)
          context.set(x, y, rule.block);
      }
    }
  };
}
