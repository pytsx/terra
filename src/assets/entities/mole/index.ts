import type { Species } from '../../../business/ecosystem/Habitat';
import { pixelSprite } from '../pixelSprite';
import config from './config.json';

const script: Species['script'] = {
  act(h) {
    const depth = h.rainy && h.homeDistance > 4 ? 3 : 2;
    if ((h.depthBelowHome < depth || h.depth < 1) &&
      (h.change(0, 0, 'GRASS', 'AIR') || h.change(0, 0, 'DIRT', 'AIR'))) return 'rest';
    if (h.change(h.face, -1, 'DIRT', 'AIR') || h.is(h.face, -1, 'AIR')) return 'tunnel';
    return 'turn';
  },
  render: pixelSprite(["..........","..aaaa....",".abbbbac..","abbbbbaek.","..cc..cc.."], {"a":"#463543","b":"#786171","c":"#d7a69e","e":"#1a1820","k":"#f7c4aa"}),
};

export default { config, script };
