import type { Scene, Slot } from '../business';

type Pose = Pick<Scene['player'], 'face' | 'vx' | 'ground' | 'animation'> & { swimming?: boolean };

export function drawExplorer(c: CanvasRenderingContext2D, p: Pose, equipment: readonly Slot[]) {
  c.save();
  if (p.face < 0) { c.translate(18, 0); c.scale(-1, 1); }
  const walk = p.swimming || (p.ground && Math.abs(p.vx) > 10) ? Math.floor(p.animation) % 2 : 0;
  c.fillStyle = equipment[2] ? '#825237' : '#554342';
  c.fillRect(3, 23 + walk, 5, 7 - walk);
  c.fillRect(11, 24 - walk, 5, 6 + walk);
  if (equipment[3]) {
    c.fillStyle = '#633d2a';
    c.fillRect(2, 27 + walk, 7, 3);
    c.fillRect(10, 28 - walk, 7, 3);
  }
  c.fillStyle = '#e6ab78';
  c.fillRect(3, 6, 13, 11);
  c.fillStyle = equipment[1] ? '#945b3a' : '#396e8e';
  c.fillRect(1, 16, 17, 10);
  c.fillStyle = '#eaa762';
  if (p.swimming) {
    c.fillRect(-3 + walk * 2, 17, 7, 4);
    c.fillRect(15, 16 + walk * 2, 7, 4);
  } else {
    c.fillRect(1, 17, 4, 9);
    c.fillRect(15, 17, 4, 9);
  }
  c.fillStyle = equipment[0] ? '#c38e5e' : '#e1d0a4';
  c.fillRect(3, 3, 13, 5);
  c.fillStyle = equipment[0] ? '#9e623f' : '#4b657e';
  c.fillRect(1, 1, 17, 5);
  c.fillRect(3, -2, 12, 4);
  c.fillStyle = '#3c404c';
  c.fillRect(11, 10, 3, 3);
  c.fillStyle = '#c7894e';
  c.fillRect(-4, 14, 6, 12);
  c.restore();
}
