import type { ItemAssetScript } from '../../types';
const item: ItemAssetScript = { inventory: {}, dropped: { persistent: true }, renderInventory(c) {
  c.fillStyle = '#75482f'; c.fillRect(6, 8, 7, 14); c.fillRect(17, 8, 7, 14); c.fillRect(5, 20, 10, 5); c.fillRect(16, 20, 10, 5);
  c.fillStyle = '#a86e49'; c.fillRect(7, 9, 5, 2); c.fillRect(18, 9, 5, 2);
} };
export default item;
