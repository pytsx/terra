import type { ItemAssetScript } from '../../types';
const cookedBeef: ItemAssetScript = {
  inventory: {},
  dropped: { persistent: true },
  renderInventory(c) {
    c.fillStyle = '#6f3930';
    c.fillRect(8, 10, 14, 9);
    c.fillStyle = '#b86c4e';
    c.fillRect(10, 8, 9, 12);
  },
  renderDropped(c) {
    c.fillStyle = '#6f3930';
    c.fillRect(-6, -4, 12, 8);
  },
};
export default cookedBeef;
