import test from 'node:test';
import assert from 'node:assert/strict';
import { B } from '../src/business/catalog';
import { World } from '../src/business/world/World';
import { createGenerationContext } from '../src/business/worldgen';
import { FeatureRegistry } from '../src/business/worldgen/features/FeatureRegistry';
import type { OreDepositFeature } from '../src/business/worldgen/features/types';
import { OreGenerator } from '../src/business/worldgen/OreGenerator';

test('registry valida e resolve IDs sem ensinar minérios concretos à estratégia', () => {
  const feature = {
    id: 'test-ore', strategy: 'ore-vein', block: 'COAL', replace: ['STONE'],
    minDepth: 4, maxDepth: 12, rarity: 0.2, maxRadius: 2, salt: 0x7711,
  } satisfies OreDepositFeature;
  const deposits = new FeatureRegistry().ore([feature]);
  assert.equal(deposits[0].block, B.COAL);
  assert.equal(deposits[0].replace.has(B.STONE), true);

  const width = 64, height = 48, cells = new Uint16Array(width * height).fill(B.STONE);
  new OreGenerator(deposits).generate(createGenerationContext({
    generationVersion: 5, seed: 42, width, height, originX: 10_000, spawnX: 32,
    surface: new Int16Array(width), globalX: x => 10_000 + x,
    get: (x, y) => x < 0 || x >= width || y < 0 || y >= height ? B.BEDROCK : cells[y * width + x],
    set: (x, y, block) => { if (x >= 0 && x < width && y >= 0 && y < height) cells[y * width + x] = block; },
  }));
  assert.ok(cells.includes(B.COAL));

  assert.throws(() => new FeatureRegistry().ore([{ ...feature, id: 'unknown', block: 'NOT_A_BLOCK' }]));
  assert.throws(() => new FeatureRegistry().ore([{ ...feature, id: 'invalid', maxRadius: 0 }]));
});

function regionChecksum(world: World, left: number, right: number) {
  let value = 2166136261;
  for (let x = left; x < right; x++) for (let y = 0; y < world.height; y++)
    value = Math.imul(value ^ world.get(x, y), 16777619);
  return value >>> 0;
}

test('refatoração preserva a golden master v5 inclusive em fronteiras negativas de chunk', () => {
  assert.equal(regionChecksum(new World('FEATURE-V5', 5), -70, 70), 2755607323);
  assert.equal(regionChecksum(new World('BOUNDARY-V5', 5), 0, 192), 3001044977);

  const forward = new World('ORDER-V5', 5), reverse = new World('ORDER-V5', 5);
  const coordinates = [-129, -128, -65, -64, -1, 0, 63, 64, 127, 128];
  for (const x of coordinates) forward.get(x, 160);
  for (const x of [...coordinates].reverse()) reverse.get(x, 160);
  for (let x = -132; x <= 132; x++) for (let y = 0; y < forward.height; y++)
    assert.equal(forward.get(x, y), reverse.get(x, y), `${x},${y}`);
});
