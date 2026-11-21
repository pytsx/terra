import type { Point } from '../business';
import { lerp, clamp, rand01, noise1 } from '../shared/math';
function blend(a: number[], b: number[], t: number) {
  return 'rgb(' + a.map((v, i) => Math.round(lerp(v, b[i], t))).join(',') + ')';
}
export function drawSky(
  c: CanvasRenderingContext2D,
  width: number,
  height: number,
  cam: Point,
  elapsed: number,
) {
  const phase = (elapsed / 240 + 0.18) % 1;
  const daylight = clamp((Math.sin(phase * Math.PI * 2) + 0.18) * 1.3, 0, 1);
  const sky = c.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, blend([24, 35, 68], [83, 145, 171], daylight));
  sky.addColorStop(1, blend([75, 78, 108], [248, 213, 164], daylight));
  c.fillStyle = sky;
  c.fillRect(0, 0, width, height);
  // Estrelas fixas no espaço; não variam entre frames.
  if (daylight < 0.68) {
    const alpha = clamp((0.7 - daylight) * 1.7, 0, 0.9);
    for (let i = 0; i < 65; i++) {
      const sx = rand01(i, 16, 0x3513) * width,
        sy = rand01(i, 23, 0x2834) * height * 0.64;
      c.globalAlpha = alpha * (0.5 + rand01(i, 53, 0x921) * 0.5);
      c.fillStyle = '#fff5d9';
      c.fillRect(sx | 0, sy | 0, i % 5 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1);
    }
    c.globalAlpha = 1;
  }
  const sunX = width * (0.12 + phase * 0.83),
    sunY = 96 + Math.cos(phase * Math.PI * 2) * 80;
  c.fillStyle = daylight > 0.4 ? '#ffe1a2' : '#c0caee';
  c.fillRect(sunX - 14, sunY - 14, 28, 28);
  c.fillRect(sunX - 18, sunY - 9, 36, 18);
  for (let layer = 0; layer < 3; layer++) {
    const color = ['#93b8b3', '#79a6aa', '#648d94'][layer];
    const horizon = 295 + layer * 56 - cam.y * 0.14;
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(0, height);
    for (let sx = 0; sx <= width + 16; sx += 16) {
      const wx = sx + cam.x * (0.16 + layer * 0.14);
      const hill =
        (noise1(wx * 0.004 + layer * 9, 0x8923) - 0.5) * 110 +
        (noise1(wx * 0.013 + 3, 0xc53) - 0.5) * 45;
      c.lineTo(sx, horizon + hill);
    }
    c.lineTo(width, height);
    c.closePath();
    c.fill();
  }
  // Silhuetas de coníferas em uma camada intermediária de paralaxe.
  const offset = cam.x * 0.56;
  c.fillStyle = blend([44, 62, 78], [71, 119, 118], daylight);
  for (
    let tree = Math.floor(offset / 18) - 1;
    tree < Math.ceil((width + offset) / 18) + 1;
    tree++
  ) {
    const wx = tree * 18,
      x = Math.floor(wx - offset),
      y = 410 - cam.y * 0.14 + (noise1(wx * 0.005, 921) - 0.5) * 65;
    const h = 15 + rand01(tree, 0, 15) * 24;
    c.fillRect(x, y + 5, 18, height - y);
    c.fillRect(x + 5, y, 2, 8);
    for (let tier = 0; tier < 5; tier++)
      c.fillRect(x + 5 - tier * 2, y - h + (tier * h) / 5, 2 + tier * 4, h / 5 + 2);
  }
  // Nuvens pixeladas de paralaxe.
  c.fillStyle = 'rgba(244,244,230,.54)';
  for (let i = 0; i < 6; i++) {
    const drift = cam.x * 0.1 - elapsed * 1.4;
    const x =
      ((((i * 237 + noise1(i * 2, 123) * 90 - drift) % (width + 240)) + (width + 240)) %
        (width + 240)) -
      80;
    const y = 75 + ((i * 71) % 160) - cam.y * 0.05;
    const size = 35 + rand01(i, 7, 23) * 70;
    c.fillRect(x, y, size, 9);
    c.fillRect(x + size * 0.2, y - 7, size * 0.46, 7);
    c.fillRect(x + size * 0.32, y + 9, size * 0.53, 4);
  }
}
