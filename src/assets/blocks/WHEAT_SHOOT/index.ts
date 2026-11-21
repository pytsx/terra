import type { BlockAssetScript } from '../../types';
const asset: BlockAssetScript = {
  placed: { render(c) {
    c.fillStyle = '#89c56a';
    c.fillRect(5, 18, 2, 6);
    c.fillRect(12, 15, 2, 14);
    c.fillRect(9, 15, 5, 3);
  } }, inventory: {}, dropped: { persistent: false },
};
export default asset;
