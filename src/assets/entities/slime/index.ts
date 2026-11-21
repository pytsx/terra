import config from './config.json';
import brain from './brain';
import type { EntityAssetScript } from '../../entity-types';

const slime: EntityAssetScript = {
  states: {
    world: { renderer: 'slime' },
    active: { activeRadius: config.activeRadius },
    dormant: { simulated: false },
    dead: { remove: true },
  },
  brain,
  render(context, view) {
    const x = view.x as number, y = view.y as number;
    const w = view.w as number;
    const face = typeof view.face === 'number' && view.face < 0 ? -1 : 1;
    context.save();
    context.translate(x + w / 2, 0);
    context.scale(face, 1);
    context.translate(-x - w / 2, 0);
    context.fillStyle = 'rgba(18,27,31,.24)';
    context.beginPath();
    context.ellipse(x + 11, y + 16, 10, 3, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#70c99b';
    context.beginPath();
    context.moveTo(x + 2, y + 14);
    context.quadraticCurveTo(x + 3, y + 5, x + 11, y + 3);
    context.quadraticCurveTo(x + 20, y + 5, x + 21, y + 14);
    context.quadraticCurveTo(x + 18, y + 18, x + 11, y + 18);
    context.quadraticCurveTo(x + 4, y + 18, x + 2, y + 14);
    context.fill();
    context.fillStyle = '#b0edca';
    context.fillRect(x + 5, y + 6, 4, 3);
    context.fillStyle = '#ecfff4';
    context.fillRect(x + 6, y + 10, 3, 4);
    context.fillRect(x + 14, y + 10, 3, 4);
    context.fillStyle = '#263b3d';
    context.fillRect(x + 7, y + 11, 2, 3);
    context.fillRect(x + 15, y + 11, 2, 3);
    context.restore();
  },
};

export { config };
export default slime;
