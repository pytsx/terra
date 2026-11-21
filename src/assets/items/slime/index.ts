import type { ItemAssetScript } from '../../types';
const slime: ItemAssetScript = {
  inventory: {},
  dropped: { persistent: true },
  renderInventory(c) {
    c.fillStyle = '#68bd91';
    c.beginPath();
    c.arc(15, 17, 8, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#b5edc9';
    c.fillRect(10, 12, 3, 3);
  },
  renderDropped(c) {
    c.fillStyle = '#68bd91';
    c.beginPath();
    c.arc(0, 0, 6, 0, Math.PI * 2);
    c.fill();
  },
};
export default slime;
