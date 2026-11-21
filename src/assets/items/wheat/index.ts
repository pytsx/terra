import type { ItemAssetScript } from '../../types';
const wheat: ItemAssetScript = {
  inventory: {},
  dropped: { persistent: true },
  renderInventory(c) {
    c.fillStyle = '#d9b85f';
    c.fillRect(14, 7, 2, 16);
    c.fillRect(10, 10, 5, 3);
    c.fillRect(16, 14, 5, 3);
  },
  renderDropped(c) {
    c.fillStyle = '#d9b85f';
    c.fillRect(-1, -7, 2, 14);
  },
};
export default wheat;
