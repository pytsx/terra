import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../src/business/world/World';
import { B, TILE } from '../src/business/catalog';
import { SimulationRegion } from '../src/business/simulation/SimulationRegion';
import { blockPartitionAt } from '../src/business/simulation/BlockPartitionScheduler';

test('água transportada do reservatório irriga o trigo até a maturação', () => {
  const world = new World('HORTA');
  const x = 10, y = 12;
  for (let row = 0; row < y; row++) world.set(x, row, B.AIR, false);
  world.set(x, y + 1, B.FARMLAND);
  world.set(x, y, B.WHEAT_SHOOT);
  world.set(x + 1, y, B.AIR, false);
  world.hydrology.restore([[x + 1, y, 200]]);
  const region = SimulationRegion.around({ x: x * TILE, y: y * TILE, w: 1, h: 1 });
  const advance = () => world.evolution.step(40, world, region, blockPartitionAt(x, y));
  advance();
  assert.equal(world.get(x, y), B.WHEAT_SHOOT);
  assert.ok(world.hydrology.transferBucket(x + 1, y, B.AIR, false));
  assert.equal(world.waterStateAt(x + 1, y).volume, 0);
  assert.ok(world.hydrology.transferBucket(x, y + 1, B.FARMLAND, true));
  assert.equal(world.waterStateAt(x, y + 1).volume, 0.2);
  advance();
  assert.equal(world.get(x, y), B.RIPE_WHEAT);
});
