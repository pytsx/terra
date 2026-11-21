import type { Species } from '../../../business/ecosystem/Habitat';
import { pixelSprite } from '../pixelSprite';
import config from './config.json';

const script: Species['script'] = {
  act(h) {
    if (h.night) {
      if (h.depth > 0) return 'emerge';
      return h.homeDistance > 7 ? 'return' : 'walk';
    }
    if (h.depth > 0) return 'rest';
    if (h.homeDistance > 0) return 'return';
    if (h.change(0, 0, 'SAND', 'AIR')) h.rememberHome();
    return 'rest';
  },
  render: pixelSprite(["c......c","cb.ec.eb",".abbbba.","ccaaaacc","c.c..c.c"], {"a":"#ac543d","b":"#db835b","c":"#ebad75","e":"#32282d","k":"#ffdea2"}),
};

export default { config, script };
