import type { BlockAssetScript } from '../../types';

const oven: BlockAssetScript = {
  placed: {
    onInteract: () => ({ openCraft: true, gridSize: 2, station: 'oven' }),
    render(c) {
      c.fillStyle = '#70483b'; c.fillRect(2, 2, 20, 21);
      c.fillStyle = '#3b2925'; c.fillRect(5, 8, 14, 11);
      c.fillStyle = '#d17a42'; c.fillRect(8, 11, 8, 5);
      c.fillStyle = '#a85e38'; c.fillRect(4, 3, 16, 3);
    },
  },
  inventory: {},
  dropped: { persistent: false },
};

export default oven;
