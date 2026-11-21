import test from 'node:test';
import assert from 'node:assert/strict';
import { B, BLOCKS } from '../src/business/catalog';
import { World } from '../src/business/world/World';
import { GAME_DAY_SECONDS } from '../src/business/time';
import { blockPartitionAt } from '../src/business/simulation/BlockPartitionScheduler';
import { SimulationRegion } from '../src/business/simulation/SimulationRegion';
import { featureGenerator } from '../src/business/worldgen/FeatureGenerator';
import { hashText, mixHash } from '../src/shared/math';

const y = 24;
const regionAt = (x: number) => SimulationRegion.around({ x: x * 24, y: y * 24, w: 1, h: 1 });
function successfulX(world: World) {
  for (let x = -40; x <= 40; x++)
    if (mixHash(x, y, world.h ^ hashText('tree.natural-growth')) / 4294967296 < 0.35) return x;
  throw new Error('coordenada sem sucesso determinístico');
}
function prepareSapling(world: World, x: number, water = 132) {
  for (let tx = x - 5; tx <= x + 5; tx++) {
    for (let row = 0; row <= y; row++) world.set(tx, row, B.AIR, false);
    world.set(tx, y + 1, B.DIRT, false);
  }
  world.set(x, y, B.SAPLING, false);
  world.hydrology.restore(water ? [[x, y, water]] : []);
}
function advance(world: World, x: number, seconds = GAME_DAY_SECONDS * 3) {
  world.evolution.step(seconds, world, regionAt(x), blockPartitionAt(x, y));
}

test('muda hidratada origina estrutura composta pelo World Evolution', () => {
  const world = new World('OAK-GROWTH'), x = successfulX(world);
  prepareSapling(world, x);
  advance(world, x, GAME_DAY_SECONDS * 3 - 0.01);
  assert.equal(world.get(x, y), B.SAPLING);
  advance(world, x, 0.01);
  assert.equal(world.get(x, y), B.WOOD);
  let wood = 0, leaves = 0;
  for (let tx = x - 5; tx <= x + 5; tx++) for (let row = y - 12; row <= y; row++) {
    wood += Number(world.get(tx, row) === B.WOOD);
    leaves += Number(world.get(tx, row) === B.LEAF);
  }
  assert.ok(wood >= 5 && leaves >= 20);
  assert.equal(world.solid(x, y), false, 'árvore natural continua usando a passagem da vegetação');
});

test('plano é atômico e não sobrescreve construção no espaço da copa', () => {
  const world = new World('OAK-BLOCKED'), x = successfulX(world);
  prepareSapling(world, x);
  const plan = featureGenerator.plan('OAK_TREE', x, y, world.h, 0)!;
  const obstruction = plan.placements.find(cell => cell.block === B.LEAF)!;
  world.set(obstruction.x, obstruction.y, B.WORKBENCH);
  advance(world, x);
  assert.equal(world.get(x, y), B.SAPLING);
  assert.equal(world.get(obstruction.x, obstruction.y), B.WORKBENCH);
  assert.equal(plan.placements.some(cell => cell.block === B.WOOD &&
    world.get(cell.x, cell.y) === B.WOOD), false, 'nenhum fragmento da árvore pode ser aplicado');
});

test('seca reinicia germinação e edição manual protege a muda', () => {
  const world = new World('OAK-RESET'), x = successfulX(world);
  prepareSapling(world, x);
  advance(world, x, GAME_DAY_SECONDS * 2);
  world.hydrology.restore([]);
  advance(world, x, 1);
  world.hydrology.restore([[x, y, 132]]);
  advance(world, x, GAME_DAY_SECONDS);
  assert.equal(world.get(x, y), B.SAPLING);

  const manual = new World('OAK-MANUAL');
  prepareSapling(manual, x);
  manual.set(x, y, B.SAPLING);
  advance(manual, x, GAME_DAY_SECONDS * 10);
  assert.equal(manual.get(x, y), B.SAPLING);
  assert.equal(manual.evolution.save().length, 0);
});

test('muda está registrada como bloco colocável e a feature usa somente IDs do catálogo', () => {
  assert.equal(BLOCKS[B.SAPLING].drop, 'sapling');
  const plan = featureGenerator.plan('OAK_TREE', 0, y, 123, 0)!;
  assert.ok(plan.placements.every(cell => Object.hasOwn(BLOCKS, cell.block)));
  assert.ok(plan.replace.has(B.AIR) && plan.replace.has(B.SAPLING));
});
