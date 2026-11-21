import type { Species } from '../../../business/ecosystem/Habitat';
import { pixelSprite } from '../pixelSprite';
import config from './config.json';

const script: Species['script'] = {
  act(h) {
    if (h.flee('fox', 5) || h.flee('wolf', 4)) return 'flee';
    if (h.night) return h.homeDistance > 1 ? 'return' : 'rest';
    return h.change(0, 0, 'GRASS', 'DIRT') ? 'rest' : 'walk';
  },
  render: pixelSprite([".....a.a.",".....b.b.","...aabbba","kabbabbea",".abbbaaaa","..cc..cc."], {"a":"#927456","b":"#c39c73","c":"#674834","e":"#302628","k":"#f4e8d2"}),
};

export default { config, script };
