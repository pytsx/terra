import { clamp, rand01 } from '../shared/math';

const MARGIN = 44;
const AREA_PER_DROP = 7_200;
const MIN_DROPS = 48;
const MAX_DROPS = 180;

export function rainDropCount(width: number, height: number) {
  return Math.round(clamp((width * height) / AREA_PER_DROP, MIN_DROPS, MAX_DROPS));
}

export function drawRain(
  c: CanvasRenderingContext2D,
  width: number,
  height: number,
  elapsed: number,
  strength: number,
  seed: number,
) {
  if (strength <= 0) return;
  const count = Math.max(1, Math.round(rainDropCount(width, height) * strength));
  const spanX = width + MARGIN * 2;
  const spanY = height + MARGIN * 2;
  c.save();
  c.beginPath();
  c.lineWidth = 1;
  c.strokeStyle = `rgba(174,207,230,${0.25 + strength * 0.32})`;
  for (let i = 0; i < count; i++) {
    const speed = 390 + rand01(i, 1, seed) * 270;
    const wind = 34 + rand01(i, 2, seed) * 38;
    const y = ((rand01(i, 3, seed) * spanY + elapsed * speed) % spanY) - MARGIN;
    const x = ((rand01(i, 4, seed) * spanX + elapsed * wind) % spanX) - MARGIN;
    const length = 8 + rand01(i, 5, seed) * 10;
    c.moveTo(x, y);
    c.lineTo(x - length * 0.22, y + length);
  }
  c.stroke();
  c.fillStyle = `rgba(61,82,105,${strength * 0.10})`;
  c.fillRect(0, 0, width, height);
  c.restore();
}
