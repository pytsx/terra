import type { Species } from '../../../business/ecosystem/Habitat';
import { pixelSprite } from '../pixelSprite';
import config from './config.json';

const script: Species['script'] = {
  act(h) {
    for (const dx of [0, h.face]) {
      if (h.is(dx, -2, 'AIR') && h.change(dx, -1, 'WOOD', 'AIR')) return 'rest';
    }
    if (h.is(0, -1, 'WOOD')) {
      if (h.clock % 14 < 7 && h.depth > -4) return 'climb';
      if (h.depth < 0) return 'descend';
    }
    return 'walk';
  },
  render: pixelSprite([".......c.c","abb.bbaaa.","bbbabbbee.","c.c.c.c..."], {"a":"#995b30","b":"#dab078","c":"#61402c","e":"#302a28","k":"#ecbd80"}),
};

export default { config, script };
