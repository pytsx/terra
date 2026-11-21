import type { BlockAssetScript } from '../../types';
import { RNG, mixHash } from '../../../shared/math';

const block: BlockAssetScript = {
  placed: {
    render(c, variant) {
      const random = new RNG(mixHash(variant, 0x601d, 0x51f15e));
      c.fillStyle = '#444957';
      c.fillRect(0, 0, 24, 24);
      for (let i = 0; i < 9; i++) {
        const x = random.int(1, 20), y = random.int(1, 20);
        c.fillStyle = i % 3 ? '#616777' : '#292d37';
        c.fillRect(x, y, random.int(2, 5), random.int(1, 2));
      }
      for (let i = 0; i < 6; i++) {
        const x = random.int(3, 18), y = random.int(3, 18);
        c.fillStyle = '#8f6518';
        c.fillRect(x - 1, y, 5, 4);
        c.fillStyle = '#d8a91f';
        c.fillRect(x, y - 1, 4, 4);
        c.fillStyle = '#ffe36a';
        c.fillRect(x + 1, y, 2, 2);
      }
    },
  },
  inventory: {},
  dropped: { persistent: false },
};

export default block;
