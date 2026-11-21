import type { BlockAssetScript } from '../../types';
import { RNG, mixHash } from '../../../shared/math';

const block: BlockAssetScript = {
  placed: {
    render(c, variant) {
      const random = new RNG(mixHash(variant, 0xc2a5, 0x51f15e));
      c.fillStyle = '#343848';
      c.fillRect(0, 0, 24, 24);
      for (let i = 0; i < 9; i++) {
        const x = random.int(1, 20), y = random.int(1, 20);
        c.fillStyle = i % 3 ? '#4e5365' : '#232632';
        c.fillRect(x, y, random.int(2, 5), random.int(1, 2));
      }
      for (let i = 0; i < 6; i++) {
        const x = random.int(3, 18), y = random.int(3, 18);
        c.fillStyle = '#187581';
        c.fillRect(x - 1, y, 5, 4);
        c.fillStyle = '#39bfc6';
        c.fillRect(x, y - 1, 4, 4);
        c.fillStyle = '#b4ffff';
        c.fillRect(x + 1, y, 2, 2);
      }
    },
  },
  inventory: {},
  dropped: { persistent: false },
};

export default block;
