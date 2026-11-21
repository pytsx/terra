import type { BlockAssetScript } from '../../types';
const asset: BlockAssetScript = {
  placed: { render(c) {
    c.fillStyle = '#89765e';
    c.fillRect(0, 0, 24, 24);
    c.fillStyle = '#493c30';
    c.fillRect(2, 3, 20, 2);
    c.fillRect(2, 11, 20, 2);
    c.fillRect(2, 19, 20, 2);
  } }, inventory: {}, dropped: { persistent: false },
};
export default asset;
