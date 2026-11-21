import type { BlockAssetScript } from '../../types';
import { RNG, mixHash } from '../../../shared/math';

export function drawWater(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  level: number,
  surface: boolean,
  mode: 'pooled' | 'flowing' | 'dripping' = 'pooled',
) {
  if (mode === 'dripping') {
    const width = Math.max(4, Math.round(size * Math.min(0.72, 0.22 + level * 0.5)));
    const left = x + Math.round((size - width) / 2);
    c.fillStyle = 'rgba(67,151,192,.7)';
    c.fillRect(left, y, width, size);
    c.fillStyle = 'rgba(142,211,224,.65)';
    c.fillRect(left, y, 1, size);
    c.fillStyle = 'rgba(196,238,244,.45)';
    c.fillRect(left + width - 2, y + 3, 1, Math.max(1, size - 6));
    return;
  }
  if (mode === 'flowing') {
    c.fillStyle = `rgba(49,126,174,${0.3 + level * 0.38})`;
    c.fillRect(x, y, size, size);
    c.fillStyle = 'rgba(142,211,224,.42)';
    c.fillRect(x, y, 1, size);
    c.fillRect(x + size - 1, y, 1, size);
    return;
  }
  const height = Math.max(1, Math.round(level * size));
  const top = y + size - height;
  c.fillStyle = 'rgba(49,126,174,.68)';
  c.fillRect(x, top, size, height);
  if (height > 9) {
    c.fillStyle = 'rgba(117,196,212,.48)';
    c.fillRect(x + 4, top + 6, 9, 1);
  }
  if (surface) {
    c.fillStyle = '#8ed3e0';
    c.fillRect(x, top, size, 1);
  }
}

const block: BlockAssetScript = {
  placed: {
    render(c, variant) {
      const random = new RNG(mixHash(variant, 0x7a73, 0x51f15e));
      c.clearRect(0, 0, 24, 24);
      c.globalAlpha = 0.84;
      c.fillStyle = '#317eae';
      c.fillRect(0, 2, 24, 22);
      for (let y = 3; y < 24; y += 5) {
        const offset = random.int(-3, 3);
        c.fillStyle = y % 10 ? '#74c7dd' : '#20577f';
        c.fillRect(Math.max(0, offset), y, 24 - Math.abs(offset), 1);
      }
      c.fillStyle = '#74c7dd';
      c.fillRect(0, 2, 24, 2);
      c.globalAlpha = 1;
    },
  },
  inventory: {},
  dropped: { persistent: false },
};

export default block;
