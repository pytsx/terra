import type { BlockAssetScript } from '../../types';

const sapling: BlockAssetScript = {
  placed: {
    render(c) {
      c.fillStyle = '#70452b';
      c.fillRect(11, 10, 3, 14);
      c.fillStyle = '#4f8739';
      c.fillRect(5, 7, 8, 5);
      c.fillRect(13, 3, 7, 6);
      c.fillStyle = '#78b655';
      c.fillRect(7, 5, 5, 4);
      c.fillRect(15, 2, 4, 3);
    },
  },
  inventory: {},
  dropped: { persistent: false },
};
export default sapling;
