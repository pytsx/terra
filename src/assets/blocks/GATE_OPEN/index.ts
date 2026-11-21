import type { BlockAssetScript } from '../../types';
const asset: BlockAssetScript = {
  placed: { render(c) {
    c.fillStyle = '#94704f';
    c.fillRect(0, 0, 3, 24);
    c.fillRect(21, 0, 3, 24);
    c.fillRect(2, 1, 20, 3);
  } }, inventory: {}, dropped: { persistent: false },
};
export default asset;
