import type { ItemAssetScript } from '../../types';

const flour: ItemAssetScript = {
  inventory: {},
  dropped: { persistent: true },
  renderInventory(c) {
    c.fillStyle = '#e8d7a2';
    c.fillRect(7, 9, 16, 12);
    c.fillStyle = '#fff2c9';
    c.fillRect(9, 7, 12, 4);
  },
  renderDropped(c) {
    c.fillStyle = '#e8d7a2';
    c.fillRect(-6, -4, 12, 8);
  },
};

export default flour;
