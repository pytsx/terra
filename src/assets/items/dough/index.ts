import type { ItemAssetScript } from '../../types';
const dough: ItemAssetScript = {
  inventory: {}, dropped: { persistent: true },
  renderInventory(c) { c.fillStyle = '#dec58f'; c.fillRect(7, 11, 16, 9); c.fillStyle = '#f2ddb0'; c.fillRect(10, 8, 10, 5); },
  renderDropped(c) { c.fillStyle = '#dec58f'; c.fillRect(-6, -4, 12, 8); },
};
export default dough;
