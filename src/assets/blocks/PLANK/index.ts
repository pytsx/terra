import type { BlockAssetScript } from '../../types';
import { RNG, mixHash } from '../../../shared/math';

const block: BlockAssetScript = {
  placed: {
    render(c, variant) {
      const random = new RNG(mixHash(variant, 0x91a, 0x51f15e));
      c.fillStyle = '#ad7446';
      c.fillRect(0, 0, 24, 24);
      for (let y = 0; y < 24; y += 6) {
        c.fillStyle = '#d39a5b'; c.fillRect(0, y, 24, 1);
        c.fillStyle = '#6c4530'; c.fillRect(0, y + 5, 24, 1);
        const seam = (random.int(6, 17) + (y % 12 ? 5 : 0)) % 24;
        c.fillStyle = '#754b32'; c.fillRect(seam, y, 1, 6);
        c.fillStyle = '#c18852'; c.fillRect(random.int(1, 18), y + 2, random.int(3, 6), 1);
      }
      c.fillStyle = '#dbab70'; c.fillRect(0, 0, 24, 2); c.fillRect(0, 2, 2, 22);
      c.fillStyle = '#68422e'; c.fillRect(0, 22, 24, 2); c.fillRect(22, 2, 2, 20);
    },
  },
  inventory: {},
  dropped: { persistent: false },
};

export default block;
