import type { Block, Item } from '../catalog';
import type { BlockAssetScript, ItemAssetScript } from '../../assets/types';
import { B, BLOCKS, ITEMS, BLOCK_SCRIPTS, ITEM_ASSETS } from '../catalog';

/** Engine-facing contract. Concrete material catalogs are compiled by assets. */
export interface Materials {
  readonly keys: Readonly<Record<string, number>>;
  readonly blocks: Readonly<Record<number, Block>>;
  readonly items: Readonly<Record<string, Item>>;
  readonly blockScripts: Readonly<Record<number, BlockAssetScript>>;
  readonly itemAssets: Readonly<Record<string, { readonly config: Item & { readonly place?: { readonly block: string; readonly quickPlace?: boolean } }; readonly script: ItemAssetScript }>>;
}
/** @deprecated Only for source-compatible standalone constructors. */
export const legacyMaterials: Materials = Object.freeze({
  keys: B, blocks: BLOCKS, items: ITEMS, blockScripts: BLOCK_SCRIPTS, itemAssets: ITEM_ASSETS,
});
export function placement(materials: Materials, id: string) {
  const key = materials.items[id]?.block;
  return key ? materials.keys[key] : undefined;
}
