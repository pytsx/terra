import test from 'node:test';
import assert from 'node:assert/strict';
import { ChunkStore } from '../src/business/world/ChunkStore';
import type { TerrainColumn } from '../src/business/worldgen/TerrainColumn';
import { EntityRegistry } from '../src/business/entities/EntityRegistry';
import { PerformanceMonitor } from '../src/app/PerformanceMonitor';

test('ChunkStore materializa seções sob demanda e atualiza o LRU ao consultar uma coluna', () => {
  const generated: string[] = [], evicted: number[] = [];
  const store = new ChunkStore(8, cx => ({
    generate(cy: number) { generated.push(`${cx},${cy}`); return new Uint16Array(64 * 32); },
  }) as TerrainColumn, () => {}, cx => evicted.push(cx));
  store.terrain(0);
  assert.deepEqual(generated, []);
  store.section(0, 3);
  store.section(0, 3);
  assert.deepEqual(generated, ['0,3']);
  for (let cx = 1; cx < 64; cx++) store.terrain(cx);
  store.terrain(0);
  store.terrain(64);
  assert.deepEqual(evicted, [1]);
});

test('estado completo e identidade de uma criatura sobrevivem ao round-trip', () => {
  const cow = EntityRegistry.create('cow', 120, 240, 7, true)!;
  cow.hit(-1, 2);
  const first = EntityRegistry.save(cow);
  const restored = EntityRegistry.restore(first)!;
  const second = EntityRegistry.save(restored);
  assert.deepEqual(second, first);
  assert.equal(restored.view().baby, true);
});

test('métricas mantêm janela limitada e calculam P95 e custo por sistema', () => {
  const metrics = new PerformanceMonitor(3);
  metrics.record(10, 2, 3);
  metrics.record(20, 4, 5);
  metrics.record(30, 6, 7);
  metrics.record(40, 8, 9);
  assert.deepEqual(metrics.snapshot(), {
    fps: 1000 / 30,
    frame: { average: 30, p95: 40, max: 40 },
    systems: { simulation: 6, rendering: 7 },
    samples: 3,
  });
});
