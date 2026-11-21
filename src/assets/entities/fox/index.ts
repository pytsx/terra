import type { Species } from '../../../business/ecosystem/Habitat';
import { pixelSprite } from '../pixelSprite';
import config from './config.json';

const script: Species['script'] = {
  act(h) {
    return h.hunt('rabbit', h.night ? 9 : 6, 2) ??
      (h.night ? 'walk' : h.homeDistance > 1 ? 'return' : 'rest');
  },
  render: pixelSprite(["......a.a.","k.....bba.","kbbaabbbe.","..abbbbbck","..abbba...","..cc..cc.."], {"a":"#984b31","b":"#d98142","c":"#503a32","e":"#22212a","k":"#f1debd"}),
};

export default { config, script };
