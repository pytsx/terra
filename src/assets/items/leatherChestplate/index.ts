import type { ItemAssetScript } from '../../types';
const item: ItemAssetScript = { inventory: {}, dropped: { persistent: true }, renderInventory(c) {
  c.fillStyle = '#9d603c'; c.fillRect(8, 7, 14, 17); c.fillRect(4, 9, 5, 8); c.fillRect(21, 9, 5, 8);
  c.fillStyle = '#ca8a5e'; c.fillRect(10, 9, 10, 3);
} };
export default item;
