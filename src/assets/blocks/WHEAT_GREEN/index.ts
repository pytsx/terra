import type { BlockAssetScript } from '../../types';
const asset: BlockAssetScript = {
  placed: { render(c) {
    c.fillStyle = '#6eaa46';
    c.fillRect(5, 6, 2, 18);
    c.fillRect(12, 10, 2, 14);
    c.fillRect(9, 9, 5, 3);
  } }, inventory: {}, dropped: { persistent: false },
};
export default asset;
