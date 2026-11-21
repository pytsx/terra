import { TILE, type Scene, type Point, type Light } from '../business';
import { clamp } from '../shared/math';
export function drawLighting(
  c: CanvasRenderingContext2D,
  l: CanvasRenderingContext2D,
  scene: Scene,
  cam: Point,
  lights: readonly (Point & { light: Light })[],
) {
  const { width, height } = l.canvas;
  const p = scene.player;
  const tx = Math.floor(p.x / TILE),
    depth = p.y / TILE - scene.world.heightAt(tx);
  const underground = clamp((depth - 1) / 12, 0, 1);
  const phase = (scene.elapsed / 240 + 0.18) % 1;
  const night = clamp(-Math.sin(phase * Math.PI * 2) * 0.58, 0, 0.56);
  const darkness = clamp(underground * 0.84 + night * (1 - underground), 0, 0.9);
  if (darkness <= 0.02) return;
  l.clearRect(0, 0, width, height);
  l.globalCompositeOperation = 'source-over';
  l.fillStyle = `rgba(5,9,25,${darkness})`;
  l.fillRect(0, 0, width, height);
  l.globalCompositeOperation = 'destination-out';
  const cut = (x: number, y: number, r: number, power = 1) => {
    x = (x - width / 2) * scene.zoom + width / 2;
    y = (y - height / 2) * scene.zoom + height / 2;
    r *= scene.zoom;
    const gradient = l.createRadialGradient(x, y, 8, x, y, r);
    gradient.addColorStop(0, `rgba(0,0,0,${power})`);
    gradient.addColorStop(0.45, `rgba(0,0,0,${power * 0.86})`);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    l.fillStyle = gradient;
    l.beginPath();
    l.arc(x, y, r, 0, Math.PI * 2);
    l.fill();
  };
  cut(p.x + p.w / 2 - cam.x, p.y + p.h / 2 - cam.y, scene.lantern ? 220 : 145, 0.93);
  for (const { x, y, light } of lights)
    cut(x, y, light.radius + Math.sin(scene.elapsed * 7 + x) * (light.flicker ?? 0), light.power);
  l.globalCompositeOperation = 'source-over';
  c.drawImage(l.canvas, 0, 0);
  c.save();
  c.translate(width / 2, height / 2);
  c.scale(scene.zoom, scene.zoom);
  c.translate(-width / 2, -height / 2);
  // Brilho quente superficial das tochas.
  for (const t of lights) {
    if (!t.light.glow) continue;
    const grad = c.createRadialGradient(t.x, t.y, 1, t.x, t.y, 27);
    grad.addColorStop(0, t.light.glow);
    grad.addColorStop(1, 'transparent');
    c.fillStyle = grad;
    c.fillRect(t.x - 27, t.y - 27, 54, 54);
  }
  c.restore();
}
