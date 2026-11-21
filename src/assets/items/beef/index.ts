import type { ItemAssetScript } from '../../types';
const beef: ItemAssetScript = {
  inventory: {},
  dropped: { persistent: true },
  renderInventory(c) {
    c.fillStyle = '#a85d4f';
    c.fillRect(8, 9, 15, 12);
    c.fillStyle = '#d0937f';
    c.fillRect(11, 10, 5, 4);
  },
  renderDropped(c) {
    c.fillStyle = '#a85d4f';
    c.fillRect(-7, -4, 14, 8);
  },
};
export default beef;
