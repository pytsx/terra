import type { ItemAssetScript } from '../../types';
const meat: ItemAssetScript = {
  inventory: {},
  dropped: { persistent: true },
  renderInventory(c) {
    c.fillStyle = '#c27867';
    c.fillRect(8, 9, 15, 12);
    c.fillStyle = '#efb0a0';
    c.fillRect(11, 10, 5, 4);
  },
  renderDropped(c) {
    c.fillStyle = '#c27867';
    c.fillRect(-7, -4, 14, 8);
  },
};
export default meat;
