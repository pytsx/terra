import type { ItemAssetScript } from '../../types';
const leather: ItemAssetScript = {
  inventory: {},
  dropped: { persistent: true },
  renderInventory(c) {
    c.fillStyle = '#9a643f';
    c.fillRect(7, 7, 16, 16);
    c.fillStyle = '#c18b61';
    c.fillRect(10, 10, 9, 3);
  },
  renderDropped(c) {
    c.fillStyle = '#9a643f';
    c.fillRect(-7, -5, 14, 10);
  },
};
export default leather;
