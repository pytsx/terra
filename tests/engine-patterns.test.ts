import test from 'node:test';
import assert from 'node:assert/strict';
import { B, BLOCKS, BLOCK_ASSETS, ITEMS, ITEM_ASSETS } from '../src/business/catalog';
import { EntityRegistry } from '../src/business/entities/EntityRegistry';
import { World, type BlockEdit } from '../src/business/world/World';
import { RNG } from '../src/shared/math';
import { ImpactParticles } from '../src/render/ImpactParticles';
import { defaultContent } from '../src/assets/runtime';

const entities = defaultContent.entities;

test('mundos e entidades compartilham definições imutáveis e mantêm a vida por instância', () => {
  assert.equal(BLOCKS[B.WATER], BLOCK_ASSETS.WATER.config);
  assert.ok(Object.isFrozen(BLOCKS[B.WATER].fluid));
  assert.equal(ITEMS.pickaxe, ITEM_ASSETS.pickaxe.config);
  assert.ok(Object.isFrozen(ITEMS.pickaxe.tool));
  assert.ok(Object.isFrozen(entities.asset('cow').config.breeding));
  const a = entities.create('slime', 0, 0, 1)!;
  const b = entities.create('slime', 0, 0, 1)!;
  a.hit(1, entities.asset('slime').config.health);
  assert.equal(a.dead, true);
  assert.equal(b.dead, false);
});

test('observadores podem sair e restaurar uma edição distante mantém o chunk descarregado', () => {
  const world = new World('OBSERVADORES');
  const first: BlockEdit[] = [], second: BlockEdit[] = [];
  const stop = world.onBlockEdited(edit => first.push(edit));
  world.onBlockEdited(edit => second.push(edit));
  world.importEdits([[-1700, 10, B.STONE]]);
  assert.equal(world.loadedChunks, 0);
  stop();
  assert.equal(world.get(-1700, 10), B.STONE);
  world.set(-1700, 10, B.AIR);
  assert.deepEqual(first, [{ x: -1700, y: 10, previous: undefined, block: B.STONE }]);
  assert.deepEqual(second, [...first, { x: -1700, y: 10, previous: B.STONE, block: B.AIR }]);
  assert.deepEqual(world.exportEdits(), [[-1700, 10, B.AIR]]);
});

test('dormência preserva o crescimento e o fim do período amoroso libera a alimentação', () => {
  const world = new World('CICLO');
  const calf = entities.create('cow', 0, 0, 0, true)!;
  const far = { x: 10000, y: 0, w: 18, h: 30, vx: 0, ground: false, face: 1 };
  const rng = new RNG(1);
  const config = entities.asset('cow').config.breeding;
  calf.step(1, world, far, rng);
  assert.equal(calf.view().state, 'dormant');
  assert.equal(calf.view().baby, true);
  assert.equal(calf.feed!(), false);
  calf.step(config.growthTime - 1, world, far, rng);
  assert.equal(calf.feed!(), true);
  assert.equal(calf.feed!(), false);
  calf.step(config.cooldown, world, far, rng);
  assert.equal(calf.inLove, false);
  assert.equal(calf.feed!(), true);
});

test('partículas expiradas são reutilizadas sem substituir efeitos ainda visíveis', () => {
  const pool = new ImpactParticles(new RNG(3));
  pool.burst(1, 10, 20, 'red', 0.1);
  pool.burst(1, 30, 40, 'blue', 0.5);
  const [short, long] = pool.visible;
  pool.step(0.2);
  assert.deepEqual(pool.visible, [long]);
  pool.burst(1, 50, 60, 'green', 0.7);
  assert.equal(pool.visible[1], short);
  assert.deepEqual([short.x, short.y, short.color, short.life, short.max], [50, 60, 'green', 0.7, 0.7]);
  pool.clear();
  assert.equal(pool.visible.length, 0);
});
