import type { BlockAssetScript } from '../../types';
import { RNG, mixHash } from '../../../shared/math';

const block: BlockAssetScript = {
  placed: {
    render(c, variant) {
      const random = new RNG(mixHash(variant, 0xd17, 0x51f15e));
      const colors = ['#a17047', '#553724', '#3d2c22'];
      c.fillStyle = '#795235';
      c.fillRect(0, 0, 24, 24);
      for (let i = 0; i < 28; i++) {
        const size = random.int(1, 3);
        c.fillStyle = colors[random.int(0, colors.length - 1)];
        c.fillRect(random.int(1, 21 - size), random.int(1, 21 - size), size, random.int(1, 2));
      }
    },
  },
  inventory: {},
  dropped: { persistent: false },
};

export default block;
