import type { ItemAssetScript } from '../../types';
const item: ItemAssetScript = { inventory: {}, dropped: { persistent: true }, renderInventory(c) {
  c.fillStyle = '#875535'; c.fillRect(7, 6, 16, 8); c.fillRect(7, 13, 6, 12); c.fillRect(17, 13, 6, 12);
  c.fillStyle = '#b77b52'; c.fillRect(9, 8, 12, 2);
} };
export default item;
