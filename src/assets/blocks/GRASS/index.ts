import type { BlockAssetScript } from '../../types';
import { RNG, mixHash } from '../../../shared/math';

const block: BlockAssetScript = {
  placed: {
    render(c, variant) {
      const random = new RNG(mixHash(variant, 0x671, 0x51f15e));
      c.fillStyle = '#795235';
      c.fillRect(0, 0, 24, 24);
      for (let i = 0; i < 24; i++) {
        c.fillStyle = i % 3 ? '#946844' : '#573a2a';
        c.fillRect(random.int(1, 21), random.int(7, 22), random.int(1, 3), random.int(1, 2));
      }
      c.fillStyle = '#4d913e';
      c.fillRect(0, 0, 24, 6);
      c.fillStyle = '#6eb34d';
      c.fillRect(0, 0, 24, 2);
      for (let x = 0; x < 24; x += random.int(2, 5)) {
        c.fillStyle = random.next() > 0.45 ? '#3d7b37' : '#579e43';
        c.fillRect(x, 5, random.int(1, 3), random.int(1, 4));
      }
      c.fillStyle = '#2f682f';
      c.fillRect(0, 6, 24, 1);
    },
  },
  inventory: {},
  dropped: { persistent: false },
};

export default block;
