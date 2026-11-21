import type { BlockAssetScript } from '../../types';
import { RNG, mixHash } from '../../../shared/math';

const gravel: BlockAssetScript = {
  placed: {
    render(c, variant) {
      const random = new RNG(mixHash(variant, 0x6a4e, 0x51f15e));
      const colors = ['#b5aea2', '#66635e', '#98938a', '#c8bead'];
      c.fillStyle = '#827e76';
      c.fillRect(0, 0, 24, 24);
      for (let i = 0; i < 34; i++) {
        const size = random.int(1, 4);
        c.fillStyle = colors[random.int(0, colors.length - 1)];
        c.fillRect(random.int(0, 23 - size), random.int(0, 23 - size), size, size);
      }
    },
  },
  inventory: {},
  dropped: { persistent: false },
};

export default gravel;
