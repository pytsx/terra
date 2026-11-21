import type { ItemAssetScript } from '../../types';

const bread: ItemAssetScript = {
  inventory: {},
  dropped: { persistent: true },
  renderInventory(c) {
    c.fillStyle = '#c98a4a';
    c.fillRect(7, 10, 16, 9);
    c.fillStyle = '#f0c477';
    c.fillRect(9, 8, 4, 4);
    c.fillRect(16, 8, 4, 4);
  },
  renderDropped(c) {
    c.fillStyle = '#c98a4a';
    c.fillRect(-7, -4, 14, 8);
  },
};

export default bread;
