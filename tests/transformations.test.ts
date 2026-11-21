import test from 'node:test';
import assert from 'node:assert/strict';
import type { TransformationAsset } from '../src/assets';
import { B } from '../src/business/catalog';
import { World } from '../src/business/world/World';
import { GAME_DAY_SECONDS } from '../src/business/time';
import { BlockTransformationSystem } from '../src/business/simulation/BlockTransformationSystem';
import { blockPartitionAt } from '../src/business/simulation/BlockPartitionScheduler';
import { SimulationRegion } from '../src/business/simulation/SimulationRegion';
import { TransformationEvaluator } from '../src/business/simulation/TransformationEvaluator';
import { TransformationRegistry, transformationRegistry } from '../src/business/simulation/TransformationRegistry';
import { hashText, mixHash } from '../src/shared/math';

const regionAt = (x: number, y: number) => SimulationRegion.around({ x: x * 24, y: y * 24, w: 1, h: 1 });
const step = (system: BlockTransformationSystem, world: World, x: number, y: number, seconds: number) =>
  system.step(seconds, world, regionAt(x, y), blockPartitionAt(x, y));
const successfulX = (world: World, id: string, probability: number) => {
  for (let x = -30; x <= 30; x++)
    if (mixHash(x, 10, world.h ^ hashText(id)) / 4294967296 < probability) return x;
  throw new Error('coordenada determinística não encontrada');
};
function prepare(world: World, x: number, y: number, block: number, water = 0, roof = false) {
  for (let row = 0; row < y; row++) world.set(x, row, row === y - 1 && roof ? B.STONE : B.AIR, false);
  world.set(x, y, block, false);
  world.hydrology.restore(water ? [[x, y, water]] : []);
}

test('registry valida composição lógica e rejeita operadores, blocos e IDs inválidos', () => {
  const fourth = {
    id: 'test.fourth', from: 'STONE', to: 'SAND', priority: 1,
    conditions: { all: [{ any: [
      { property: 'water.saturation', operator: '>', value: 0 },
      { not: { property: 'environment.exposedToSky', operator: '==', value: true } },
    ] }] },
    duration: { seconds: 1, mode: 'continuous' }, probability: 1,
    retry: 'on-condition-reset', preserve: ['waterVolume'],
  } satisfies TransformationAsset;
  const registry = new TransformationRegistry([fourth]);
  const action = registry.forBlock(B.STONE)[0].action;
  assert.equal(action.type === 'transformBlock' ? action.to : undefined, B.SAND);
  assert.throws(() => new TransformationRegistry([{ ...fourth, id: 'bad', from: 'UNKNOWN' }]));
  assert.throws(() => new TransformationRegistry([fourth, fourth]));
  assert.throws(() => new TransformationRegistry([{ ...fourth, id: 'operator',
    conditions: { property: 'water.saturation', operator: 'contains', value: 1 } } as unknown as TransformationAsset]));
});

test('evaluator interpreta all, any e not sem executar código dos assets', () => {
  const rule = new TransformationRegistry([{
    id: 'logic', from: 'STONE', to: 'SAND',
    conditions: { all: [
      { property: 'water.saturation', operator: '>=', value: 1 },
      { not: { property: 'environment.exposedToSky', operator: '==', value: true } },
    ] }, duration: { seconds: 2, mode: 'continuous' }, probability: 1,
    retry: 'on-condition-reset', preserve: [],
  }]).rules[0];
  const evaluator = new TransformationEvaluator();
  const result = evaluator.evaluate(rule, {
    water: { volume: 0.08, capacity: 0.08, saturation: 1 },
    environment: { exposedToSky: false },
  }, { elapsed: 1, attempted: false }, 1);
  assert.deepEqual(result, { conditionsSatisfied: true, elapsed: 2, durationReached: true, canAttempt: true });
});

test('pedra exige cinco dias contínuos e conserva volume absoluto ao virar gravel', () => {
  const world = new World('STONE-RULE');
  const x = successfulX(world, 'stone.weathering', 0.1), y = 10;
  prepare(world, x, y, B.STONE, 80);
  step(world.transformations, world, x, y, GAME_DAY_SECONDS * 5 - 0.01);
  assert.equal(world.get(x, y), B.STONE);
  step(world.transformations, world, x, y, 0.01);
  assert.equal(world.get(x, y), B.GRAVEL);
  assert.deepEqual(world.waterStateAt(x, y), { volume: 0.08, capacity: 2, saturation: 0.04 });
});

test('interromper a condição zera a duração e falha probabilística tenta uma única vez', () => {
  const alwaysFail = new TransformationRegistry([{
    id: 'test.once', from: 'STONE', to: 'GRAVEL',
    conditions: { property: 'water.saturation', operator: '>=', value: 1 },
    duration: { days: 5, mode: 'continuous' }, probability: 0,
    retry: 'on-condition-reset', preserve: ['waterVolume'],
  }]);
  const system = new BlockTransformationSystem(alwaysFail), world = new World('RESET-RULE'), x = 2, y = 10;
  prepare(world, x, y, B.STONE, 80);
  step(system, world, x, y, GAME_DAY_SECONDS * 3);
  world.hydrology.restore([]);
  step(system, world, x, y, 1);
  world.hydrology.restore([[x, y, 80]]);
  step(system, world, x, y, GAME_DAY_SECONDS * 2);
  assert.equal(system.save()[0][3], GAME_DAY_SECONDS * 2);
  step(system, world, x, y, GAME_DAY_SECONDS * 3);
  const afterAttempt = system.save()[0];
  assert.equal(afterAttempt[4], 1);
  assert.equal(afterAttempt[5], 1);
  step(system, world, x, y, GAME_DAY_SECONDS * 20);
  assert.deepEqual(system.save()[0], afterAttempt);
});

test('grama cresce somente em terra saturada realmente exposta e seca de volta para terra', () => {
  const growthWorld = new World('GRASS-GROWTH');
  const gx = successfulX(growthWorld, 'grass.growth', 0.5), y = 10;
  prepare(growthWorld, gx, y, B.DIRT, 550);
  step(growthWorld.transformations, growthWorld, gx, y, GAME_DAY_SECONDS);
  assert.equal(growthWorld.get(gx, y), B.GRASS);

  const covered = new World('GRASS-GROWTH');
  prepare(covered, gx, y, B.DIRT, 550, true);
  step(covered.transformations, covered, gx, y, GAME_DAY_SECONDS * 3);
  assert.equal(covered.get(gx, y), B.DIRT);

  const decayWorld = new World('GRASS-DECAY');
  const dx = successfulX(decayWorld, 'grass.decay', 0.5);
  prepare(decayWorld, dx, y, B.GRASS);
  step(decayWorld.transformations, decayWorld, dx, y, GAME_DAY_SECONDS * 5);
  assert.equal(decayWorld.get(dx, y), B.DIRT);
});

test('estado temporal persiste, pausa fora da região e edição manual invalida e protege a célula', () => {
  const first = new World('PERSIST-RULE'), x = successfulX(first, 'stone.weathering', 0.1), y = 10;
  prepare(first, x, y, B.STONE, 80);
  step(first.transformations, first, x, y, GAME_DAY_SECONDS * 3);
  const saved = first.transformations.save();

  const restored = new World('PERSIST-RULE');
  prepare(restored, x, y, B.STONE, 80);
  restored.transformations.restore(saved);
  // Ten inactive days do not enter the scheduler and therefore do not advance progress.
  step(restored.transformations, restored, x, y, GAME_DAY_SECONDS * 2);
  assert.equal(restored.get(x, y), B.GRAVEL);

  const protectedWorld = new World('MANUAL-RULE');
  prepare(protectedWorld, x, y, B.STONE, 80);
  protectedWorld.set(x, y, B.STONE);
  step(protectedWorld.transformations, protectedWorld, x, y, GAME_DAY_SECONDS * 20);
  assert.equal(protectedWorld.get(x, y), B.STONE);
  assert.equal(protectedWorld.transformations.save().length, 0);
});

test('prioridade resolve conflito uma vez e uma quarta regra funciona apenas como asset', () => {
  const base = {
    from: 'STONE', conditions: { property: 'water.saturation', operator: '>=', value: 0 },
    duration: { seconds: 1, mode: 'continuous' }, probability: 1,
    retry: 'on-condition-reset', preserve: ['waterVolume'],
  } as const;
  const assets: TransformationAsset[] = [
    { ...base, id: 'low', priority: 1, to: 'GRASS' },
    { ...base, id: 'fourth.asset.only', priority: 9, to: 'SAND' },
  ];
  const system = new BlockTransformationSystem(new TransformationRegistry(assets));
  const world = new World('FOURTH-RULE'), x = 3, y = 10;
  prepare(world, x, y, B.STONE);
  step(system, world, x, y, 1);
  assert.equal(world.get(x, y), B.SAND);
  assert.equal(system.save().length, 0);
  assert.equal(transformationRegistry.rules.length, 5);
});
