import type { BlockAssetScript } from '../../types';
const asset: BlockAssetScript = {
  placed: { render(c) {
    c.fillStyle = '#675034';
    c.fillRect(0, 0, 3, 24);
    c.fillRect(21, 0, 3, 24);
    c.fillRect(2, 1, 20, 3);
    c.fillRect(2, 5, 20, 18);
  } }, inventory: {}, dropped: { persistent: false },
};
export default asset;
