import type { BlockAssetScript } from '../../types';

const block: BlockAssetScript = {
  placed: {
    render(c) {
      c.clearRect(0, 0, 24, 24);
      c.fillStyle = '#70452c'; c.fillRect(11, 8, 3, 16);
      c.fillStyle = '#b47a40'; c.fillRect(12, 9, 1, 14);
      c.fillStyle = '#ef7c32'; c.fillRect(9, 3, 7, 7);
      c.fillStyle = '#ffd35a'; c.fillRect(11, 1, 4, 7);
      c.fillStyle = '#fff0a1'; c.fillRect(12, 3, 2, 4);
    },
  },
  inventory: {},
  dropped: { persistent: false },
};

export default block;
