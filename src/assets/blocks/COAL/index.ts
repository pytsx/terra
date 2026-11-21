import type { BlockAssetScript } from '../../types';
import { RNG, mixHash } from '../../../shared/math';

const block: BlockAssetScript = {
  placed: {
    render(c, variant) {
      const random = new RNG(mixHash(variant, 0xc0a1, 0x51f15e));
      c.fillStyle = '#7f8490';
      c.fillRect(0, 0, 24, 24);
      for (let i = 0; i < 9; i++) {
        const x = random.int(1, 20), y = random.int(1, 20);
        c.fillStyle = i % 3 ? '#9ca0a8' : '#5c616d';
        c.fillRect(x, y, random.int(2, 5), random.int(1, 2));
      }
      for (let i = 0; i < 6; i++) {
        const x = random.int(3, 18), y = random.int(3, 18);
        c.fillStyle = '#15181d';
        c.fillRect(x - 1, y, 5, 4);
        c.fillStyle = '#30343b';
        c.fillRect(x, y - 1, 4, 4);
        c.fillStyle = '#555b65';
        c.fillRect(x + 1, y, 2, 2);
      }
    },
  },
  inventory: {},
  dropped: { persistent: false },
};

export default block;
