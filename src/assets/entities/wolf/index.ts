import config from './config.json';
import brain from './brain';
import type { EntityAssetScript } from '../../entity-types';

const wolf: EntityAssetScript = {
  states: {
    world: { renderer: 'wolf' },
    active: { activeRadius: config.activeRadius },
    dormant: { simulated: false },
    dead: { remove: true },
  },
  brain,
  render(context, view) {
    const x = view.x as number, y = view.y as number;
    const w = view.w as number, h = view.h as number;
    const face = typeof view.face === 'number' && view.face < 0 ? -1 : 1;
    context.save();
    context.translate(x + w / 2, 0);
    context.scale(face, 1);
    context.translate(-x - w / 2, 0);
    context.fillStyle = 'rgba(18,27,31,.22)';
    context.fillRect(x + 3, y + h - 1, w - 6, 3);
    context.fillStyle = '#71808a';
    context.fillRect(x + 4, y + 8, w - 10, h - 10);
    context.fillRect(x + w - 11, y + 3, 9, 11);
    context.fillStyle = '#98a5a9';
    context.fillRect(x + 7, y + 5, w - 17, 8);
    context.fillStyle = '#bfc8c4';
    context.fillRect(x + w - 8, y + 9, 7, 4);
    context.fillStyle = '#27343d';
    context.fillRect(x + w - 5, y + 5, 2, 2);
    context.fillRect(x + w - 3, y + 12, 3, 2);
    context.fillRect(x + 5, y + h - 3, 5, 5);
    context.fillRect(x + w - 11, y + h - 3, 5, 5);
    context.fillStyle = '#697985';
    context.beginPath();
    context.moveTo(x + w - 9, y + 4);
    context.lineTo(x + w - 6, y - 3);
    context.lineTo(x + w - 2, y + 5);
    context.fill();
    context.restore();
  },
};

export { config };
export default wolf;
