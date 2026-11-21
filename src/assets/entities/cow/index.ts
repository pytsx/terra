import config from './config.json';
import brain from './brain';
import type { EntityAssetScript } from '../../entity-types';

const cow: EntityAssetScript = {
  states: {
    world: { renderer: 'cow' },
    active: { activeRadius: config.activeRadius },
    dormant: { simulated: false },
    dead: { remove: true },
  },
  brain,
  render(context, view) {
    const x = view.x as number, y = view.y as number;
    const w = view.w as number, h = view.h as number;
    const baby = view.baby === true;
    const scale = baby ? 0.72 : 1;
    const face = typeof view.face === 'number' && view.face < 0 ? -1 : 1;
    context.save();
    context.translate(x + w / 2, y + h);
    context.scale(face * scale, scale);
    context.translate(-w / 2, -h);
    context.fillStyle = 'rgba(18,27,31,.22)';
    context.fillRect(2, h - 1, w - 4, 3);
    context.fillStyle = '#e8d1aa';
    context.fillRect(3, 7, w - 7, h - 10);
    context.fillStyle = '#7a4d3b';
    context.fillRect(8, 9, 7, 6);
    context.fillRect(w - 12, 13, 6, 5);
    context.fillRect(3, h - 8, 4, 8);
    context.fillRect(w - 7, h - 8, 4, 8);
    context.fillStyle = '#f1dfbd';
    context.fillRect(w - 9, 3, 9, 10);
    context.fillRect(w - 13, 1, 4, 5);
    context.fillRect(w - 2, 1, 4, 5);
    context.fillStyle = '#5d4135';
    context.fillRect(w - 5, 6, 2, 2);
    context.fillRect(w - 9, 10, 6, 3);
    context.fillStyle = '#f4a1a1';
    context.fillRect(w - 7, 15, 3, 2);
    context.strokeStyle = '#6b4a38';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(5, 12);
    context.quadraticCurveTo(-4, 8, 0, 20);
    context.stroke();
    if (view.love === true) {
      context.fillStyle = '#ff8199';
      context.fillRect(w - 1, -5, 4, 4);
      context.fillRect(w + 5, -10, 3, 3);
    }
    context.restore();
  },
};

export { config };
export default cow;
