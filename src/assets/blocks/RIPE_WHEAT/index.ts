import type { BlockAssetScript } from '../../types';
const asset: BlockAssetScript = {
  placed: { render(c) {
    c.fillStyle = '#e4bc57';
    c.fillRect(5, 6, 2, 18);
    c.fillRect(12, 10, 2, 14);
    c.fillRect(9, 9, 5, 3);
    c.fillRect(3, 2, 6, 7);
    c.fillRect(10, 4, 6, 7);
  } }, inventory: {}, dropped: { persistent: false },
};
export default asset;
