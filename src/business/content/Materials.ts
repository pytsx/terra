import { B, BLOCKS, ITEMS, BLOCK_SCRIPTS, ITEM_ASSETS } from '../catalog';

/** Default bindings for the original standalone constructors. */
export const installedMaterials = Object.freeze({
  keys: B, blocks: BLOCKS, items: ITEMS, blockScripts: BLOCK_SCRIPTS, itemAssets: ITEM_ASSETS,
});
export type Materials = typeof installedMaterials;
export function placement(materials: Materials, id: string) {
  const key = materials.items[id]?.block;
  return key ? materials.keys[key] : undefined;
}
