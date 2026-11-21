import type { BlockAssetScript } from '../../types';
import { RNG, mixHash } from '../../../shared/math';

const block: BlockAssetScript = {
  placed: {
    render(c, variant) {
      const random = new RNG(mixHash(variant, 0x1a7a, 0x51f15e));
      c.clearRect(0, 0, 24, 24);
      c.globalAlpha = 0.9;
      c.fillStyle = '#e34a1f'; c.fillRect(0, 2, 24, 22);
      for (let y = 3; y < 24; y += 5) {
        const offset = random.int(-3, 3);
        c.fillStyle = y % 10 ? '#ffbd35' : '#941f18';
        c.fillRect(Math.max(0, offset), y, 24 - Math.abs(offset), 1);
      }
      c.fillStyle = '#ffd75a'; c.fillRect(0, 2, 24, 2);
      c.globalAlpha = 1;
    },
  },
  inventory: {},
  dropped: { persistent: false },
};

export default block;
