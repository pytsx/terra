import type { BlockAssetScript } from '../../types';
import { RNG, mixHash } from '../../../shared/math';

const block: BlockAssetScript = {
  placed: {
    render(c, variant) {
      const random = new RNG(mixHash(variant, 0x800d, 0x51f15e));
      c.fillStyle = '#8c5737';
      c.fillRect(0, 0, 24, 24);
      for (let x = 2; x < 24; x += random.int(4, 7)) {
        c.fillStyle = '#b57443'; c.fillRect(x, 0, random.int(1, 2), 24);
        c.fillStyle = '#673d2c'; c.fillRect(x + 2, 0, 1, 24);
      }
      for (let i = 0; i < 3; i++) {
        const x = random.int(3, 18), y = random.int(3, 20);
        c.fillStyle = '#543326'; c.fillRect(x, y, 4, 2);
        c.fillStyle = '#c1814c'; c.fillRect(x + 1, y, 2, 1);
      }
      c.fillStyle = '#c1814c'; c.fillRect(0, 0, 24, 2); c.fillRect(0, 2, 2, 22);
      c.fillStyle = '#4f3024'; c.fillRect(0, 22, 24, 2); c.fillRect(22, 2, 2, 20);
    },
  },
  inventory: {},
  dropped: { persistent: false },
};

export default block;
