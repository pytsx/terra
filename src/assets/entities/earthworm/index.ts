import type { Species } from '../../../business/ecosystem/Habitat';
import { pixelSprite } from '../pixelSprite';
import config from './config.json';

const script: Species['script'] = {
  act(h) {
    if (h.depth <= 0 && h.is(0, -1, 'AIR') && h.change(0, 0, 'DIRT', 'GRASS')) return 'rest';
    if (h.depth > 0) return h.rainy || h.night ? 'emerge' : 'rest';
    if (!h.rainy && !h.night && h.change(0, 0, 'GRASS', 'AIR')) return 'rest';
    return 'walk';
  },
  render: pixelSprite(["..bb...bb.",".baabaabbe","bb..bb..ab"], {"a":"#9c5254","b":"#db8981","c":"#da9092","e":"#6a3938","k":"#ffc1aa"}),
};

export default { config, script };
