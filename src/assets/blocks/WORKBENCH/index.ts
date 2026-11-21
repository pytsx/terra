import type { BlockAssetScript } from '../../types';
import { RNG, mixHash } from '../../../shared/math';

const workbench: BlockAssetScript = {
  placed: {
    onInteract: () => ({ openCraft: true, gridSize: 3 }),
    render(c, variant) {
      const random = new RNG(mixHash(variant, 0xc4af7, 0x51f15e));
      c.fillStyle = '#ad7446';
      c.fillRect(0, 0, 24, 24);
      for (let y = 0; y < 24; y += 6) {
        c.fillStyle = '#d39a5b'; c.fillRect(0, y, 24, 1);
        c.fillStyle = '#6c4530'; c.fillRect(0, y + 5, 24, 1);
        c.fillStyle = '#754b32'; c.fillRect(random.int(7, 18), y, 1, 6);
      }
      c.fillStyle = '#d9b16c'; c.fillRect(0, 0, 24, 7);
      c.fillStyle = '#553b2b'; c.fillRect(0, 7, 24, 2);
      c.fillStyle = '#72503a'; c.fillRect(3, 11, 18, 9);
      c.fillStyle = '#c79a5c'; c.fillRect(5, 13, 5, 3);
      c.fillStyle = '#9ba6a2'; c.fillRect(14, 11, 5, 3);
      c.fillStyle = '#4e3225'; c.fillRect(2, 20, 4, 4); c.fillRect(18, 20, 4, 4);
    },
  },
  inventory: { gridSize: 3 },
  dropped: { persistent: false },
};

export default workbench;
