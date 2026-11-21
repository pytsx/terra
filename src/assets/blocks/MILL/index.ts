import type { BlockAssetScript } from '../../types';

const mill: BlockAssetScript = {
  placed: {
    onInteract: () => ({ openCraft: true, gridSize: 2, station: 'mill' }),
    render(c) {
      c.fillStyle = '#a8794e'; c.fillRect(2, 3, 20, 19);
      c.fillStyle = '#e0c184'; c.fillRect(5, 6, 14, 3);
      c.fillStyle = '#6d4933'; c.fillRect(10, 9, 4, 11);
      c.fillStyle = '#d8b06b'; c.fillRect(7, 12, 10, 3);
    },
  },
  inventory: {},
  dropped: { persistent: false },
};

export default mill;
