import test from 'node:test';
import assert from 'node:assert/strict';
import { B, TILE } from '../src/business/catalog';
import {
  BLOCK_PARTITION_COUNT,
  BlockPartitionScheduler,
  blockPartitionAt,
} from '../src/business/simulation/BlockPartitionScheduler';
import { EntityUpdateGroup } from '../src/business/simulation/EntityUpdateGroup';
import { SimulationRegion } from '../src/business/simulation/SimulationRegion';
import { World } from '../src/business/world/World';

test('partições de blocos alternam em ordem embaralhada e cobrem um ciclo completo', () => {
  const scheduler = new BlockPartitionScheduler(42);
  const processed: number[] = [];
  for (let frame = 0; frame < BLOCK_PARTITION_COUNT; frame++) {
    scheduler.advance(1 / 60);
    const batch = scheduler.next();
    assert.equal(batch.partitions.length, 1);
    processed.push(batch.primary.id);
  }
  assert.equal(new Set(processed).size, BLOCK_PARTITION_COUNT);
});

test('edição direta promove todas as partições vizinhas a trabalho urgente', () => {
  const scheduler = new BlockPartitionScheduler(7);
  scheduler.advance(0.1);
  scheduler.invalidateNeighborhood(10, 10);
  const batch = scheduler.next();
  const affected = new Set([
    blockPartitionAt(10, 10), blockPartitionAt(9, 10), blockPartitionAt(11, 10),
    blockPartitionAt(10, 9), blockPartitionAt(10, 11),
  ]);
  assert.deepEqual(new Set(batch.partitions.filter(work => work.urgent).map(work => work.id)), affected);
  assert.ok(batch.partitions.some(work => work.id === blockPartitionAt(10, 10) && work.urgent));
  assert.equal(scheduler.stats.pendingInvalidations, 0);
});

test('grupo de entidades seleciona somente organismos vivos dentro da região ativa', () => {
  const region = SimulationRegion.around({ x: 20 * TILE, y: 20 * TILE, w: TILE, h: TILE * 2 });
  const entity = (x: number, y: number, dead = false) => ({
    dead,
    view: () => ({ x: x * TILE, y: y * TILE, w: TILE, h: TILE }),
  });
  const inside = entity(20, 20);
  const dead = entity(20, 20, true);
  const outside = entity(200, 200);
  const active = new EntityUpdateGroup().select([inside, dead, outside], region);
  assert.deepEqual(active, [inside]);
});

test('gravidade reage a remoção no próximo quadro e congela fora da região ativa', () => {
  const world = new World('PARTICOES-ATIVAS');
  const nearX = 12, farX = 150, y = 10;
  for (const x of [nearX, farX]) {
    world.set(x, y + 1, B.STONE);
    world.set(x, y, B.SAND);
    world.set(x, y + 1, B.AIR);
  }
  const near = SimulationRegion.around({ x: nearX * TILE, y: y * TILE, w: TILE, h: TILE });
  const noActor = () => false;
  const noDrop = () => undefined;
  world.stepBlocks(0.1, true, near, 0, 0, noActor, noDrop);
  assert.equal(world.get(nearX, y), B.AIR);
  assert.equal(world.get(nearX, y + 1), B.SAND);
  assert.equal(world.get(farX, y), B.SAND);

  const far = SimulationRegion.around({ x: farX * TILE, y: y * TILE, w: TILE, h: TILE });
  for (let frame = 0; frame < BLOCK_PARTITION_COUNT; frame++)
    world.stepBlocks(0.1, true, far, 0, 0, noActor, noDrop);
  assert.equal(world.get(farX, y), B.AIR);
  assert.ok(Array.from({ length: BLOCK_PARTITION_COUNT }, (_, offset) =>
    world.get(farX, y + 1 + offset)).includes(B.SAND));
});

test('passos sem novo quadro apenas acumulam tempo para os blocos', () => {
  const world = new World('ACUMULO-POR-QUADRO');
  const region = SimulationRegion.around({ x: 10 * TILE, y: 10 * TILE, w: TILE, h: TILE });
  const before = world.blockUpdateStats.lastPrimary;
  world.stepBlocks(1 / 60, false, region, 0, 0, () => false, () => undefined);
  assert.equal(world.blockUpdateStats.lastPrimary, before);
  world.stepBlocks(1 / 60, true, region, 0, 0, () => false, () => undefined);
  assert.notEqual(world.blockUpdateStats.lastPrimary, before);
});

test('fluido em movimento ignora o sorteio de partições e volta ao grupo comum ao estabilizar', () => {
  const moving = new World('FLUIDO-PRIORITARIO');
  const x = 18, y = 12;
  moving.set(x, y, B.WATER);
  const region = SimulationRegion.around({ x: x * TILE, y: y * TILE, w: TILE, h: TILE });
  assert.ok(moving.blockUpdateStats.priorityFluids > 0);
  // A cadência normal da hidrologia é maior que este delta. O volume abaixo
  // só pode aparecer se a camada prioritária tiver sido atualizada neste quadro.
  moving.stepBlocks(1 / 60, true, region, 0, 0, () => false, () => undefined);
  assert.ok(moving.waterAt(x, y + 1) > 0);
  assert.ok(moving.blockUpdateStats.priorityFluids > 0);

  const still = new World('FLUIDO-PARADO');
  still.set(x - 1, y, B.BEDROCK);
  still.set(x + 1, y, B.BEDROCK);
  still.set(x, y + 1, B.BEDROCK);
  still.set(x, y, B.WATER);
  still.stepBlocks(1 / 60, true, region, 0, 0, () => false, () => undefined);
  assert.equal(still.blockUpdateStats.priorityFluids, 0);
});
