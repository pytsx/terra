import type { BlockAssetScript } from '../../types';
import { RNG, mixHash } from '../../../shared/math';

const block: BlockAssetScript = {
  placed: {
    render(c, variant) {
      const random = new RNG(mixHash(variant, 0xb21, 0x51f15e));
      c.fillStyle = '#633d33';
      c.fillRect(0, 0, 24, 24);
      for (let row = 0; row < 4; row++) {
        const y = row * 6, offset = row % 2 ? -5 : 0;
        c.fillStyle = '#b46b50';
        c.fillRect(0, y + 1, 24, 4);
        c.fillStyle = '#d18a65';
        c.fillRect(0, y + 1, 24, 1);
        c.fillStyle = '#563830';
        for (let x = offset; x < 24; x += 11) c.fillRect(x, y, 2, 6);
        if (random.next() > 0.5) {
          c.fillStyle = '#8e503f';
          c.fillRect(random.int(2, 19), y + 3, 3, 1);
        }
      }
      c.fillStyle = '#d18a65'; c.fillRect(0, 0, 24, 2); c.fillRect(0, 2, 2, 22);
      c.fillStyle = '#563830'; c.fillRect(0, 22, 24, 2); c.fillRect(22, 2, 2, 20);
    },
  },
  inventory: {},
  dropped: { persistent: false },
};

export default block;
