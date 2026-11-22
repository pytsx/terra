import type { Block, Item } from '../EngineTypes';
import type { BlockAssetScript, ItemAssetScript } from '../../assets/types';
import type { ContentPack } from './ContentPack';

function extend<T, S, Base extends Record<string, unknown>>(
  base: Base, packs: readonly ContentPack[], entries: (pack: ContentPack) => Record<string, T> | undefined,
  script: (config: T) => S,
) {
  const additions: Record<string, { config: T; script: S }> = Object.create(null);
  for (const pack of packs) {
    for (const [id, config] of Object.entries(entries(pack) ?? {})) {
      if (id in base || Object.hasOwn(additions, id)) throw new Error(pack.id + ': ID duplicado ' + id);
      additions[id] = { config, script: script(config) };
    }
  }
  return { ...base, ...additions };
}

export const extendBlocks = <T extends Record<string, unknown>>(packs: readonly ContentPack[], base: T) =>
  extend<Block, BlockAssetScript, T>(base, packs, pack => pack.blocks, block => ({
    placed: { render(c) {
      if (block.texture?.base || !block.texture?.detail?.length) {
        c.fillStyle = block.texture?.base ?? block.color;
        c.fillRect(0, 0, 24, 24);
      }
      for (const rect of block.texture?.detail ?? []) {
        c.fillStyle = rect.color;
        c.fillRect(rect.x, rect.y, rect.w, rect.h);
      }
    } }, inventory: {}, dropped: {},
  }));

export const extendItems = <T extends Record<string, unknown>>(packs: readonly ContentPack[], base: T) =>
  extend<Item, ItemAssetScript, T>(base, packs, pack => pack.items, () => ({
    inventory: {}, dropped: { persistent: true },
  }));
