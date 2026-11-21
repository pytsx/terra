import type { BlockAssetScript } from '../../types';
import { RNG, mixHash } from '../../../shared/math';

const block: BlockAssetScript = {
  placed: {
    render(c, variant) {
      const random = new RNG(mixHash(variant, 0x570e, 0x51f15e));
      c.fillStyle = '#7c818d';
      c.fillRect(0, 0, 24, 24);
      for (let i = 0; i < 11; i++) {
        const x = random.int(1, 20), y = random.int(1, 20);
        c.fillStyle = i % 3 ? '#a2a6ae' : '#565c68';
        c.fillRect(x, y, random.int(2, 5), random.int(1, 2));
        if (i % 2) {
          c.fillStyle = '#565c68';
          c.fillRect(x + 2, y + 2, 2, random.int(1, 3));
        }
      }
    },
  },
  inventory: {},
  dropped: { persistent: false },
};

export default block;
