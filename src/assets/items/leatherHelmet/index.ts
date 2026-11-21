import type { ItemAssetScript } from '../../types';
const item: ItemAssetScript = { inventory: {}, dropped: { persistent: true }, renderInventory(c) {
  c.fillStyle = '#a96e45'; c.fillRect(6, 8, 18, 7); c.fillRect(7, 14, 4, 8); c.fillRect(19, 14, 4, 8);
  c.fillStyle = '#d39a69'; c.fillRect(8, 9, 14, 2);
} };
export default item;
