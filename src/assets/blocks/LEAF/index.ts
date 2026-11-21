import type { BlockAssetScript } from '../../types';
import { RNG, mixHash } from '../../../shared/math';

const block: BlockAssetScript = {
  placed: {
    render(c, variant) {
      const random = new RNG(mixHash(variant, 0x1eaf, 0x51f15e));
      const colors = ['#3d8651', '#56a961', '#74bd70', '#245c3b'];
      c.clearRect(0, 0, 24, 24);
      c.fillStyle = '#2f6f45';
      c.fillRect(1, 1, 22, 22);
      for (let i = 0; i < 30; i++) {
        c.fillStyle = colors[random.int(0, colors.length - 1)];
        c.fillRect(random.int(1, 20), random.int(1, 20), random.int(2, 4), random.int(2, 4));
      }
      for (let i = 0; i < 7; i++) c.clearRect(random.int(2, 20), random.int(2, 20), 2, 2);
      c.fillStyle = '#70b66c'; c.fillRect(0, 0, 24, 2); c.fillRect(0, 2, 2, 22);
      c.fillStyle = '#214d35'; c.fillRect(0, 22, 24, 2); c.fillRect(22, 2, 2, 20);
    },
  },
  inventory: {},
  dropped: { persistent: false },
};

export default block;
