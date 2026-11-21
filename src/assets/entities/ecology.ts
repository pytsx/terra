import mole from './mole';
import rabbit from './rabbit';
import earthworm from './earthworm';
import termite from './termite';
import sandcrab from './sandcrab';
import fox from './fox';
import { packs } from '../packs/generated';
import { pixelSprite } from './pixelSprite';
import { compileBehaviors } from '../../business/ecosystem/BehaviorCompiler';
import type { Species } from '../../business/ecosystem/Habitat';

const legacy = { mole, rabbit, earthworm, termite, sandcrab, fox };
const additions: Record<string, Species> = Object.create(null);
for (const { config, sprite, behaviors } of packs.flatMap(pack => pack.species ?? [])) {
  if (!config.id || config.id in legacy || Object.hasOwn(additions, config.id) ||
      ['slime', 'cow', 'wolf'].includes(config.id) ||
      ![config.width, config.height, config.speed, config.interval, config.health, config.spawn.weight,
        config.activeRadius].every(n => Number.isFinite(n) && n > 0) ||
      !sprite.rows.length || sprite.rows.some(row => !row.length || row.length !== sprite.rows[0].length ||
        [...row].some(pixel => pixel !== '.' && !Object.hasOwn(sprite.palette, pixel))))
    throw new Error('Espécie ou sprite inválido: ' + config.id);
  additions[config.id] = { config, script: { act: compileBehaviors(behaviors), render: pixelSprite(sprite.rows, sprite.palette) } };
}
export const ecologicalEntities = { ...legacy, ...additions };
