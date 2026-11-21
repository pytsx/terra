import test from 'node:test';
import assert from 'node:assert/strict';
import { ChunkStore } from '../src/business/world/ChunkStore';
import type { TerrainColumn } from '../src/business/worldgen/TerrainColumn';
import { EntityRegistry } from '../src/business/entities/EntityRegistry';
import { PerformanceMonitor } from '../src/app/PerformanceMonitor';
import { RegionalEntityStore } from '../src/business/entities/RegionalEntityStore';
import { SimulationRegion } from '../src/business/simulation/SimulationRegion';
import { CHUNK_WIDTH, TILE } from '../src/business/catalog';
import { decodeSave } from '../src/store/codec';

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

test('entidades fora da região ativa são suspensas e reidratadas com o mesmo estado', () => {
  const near = EntityRegistry.create('cow', 0, 24 * TILE, 11, true)!;
  const far = EntityRegistry.create('wolf', CHUNK_WIDTH * 4 * TILE, 24 * TILE, 12)!;
  far.hit(-1, 2);
  const farSave = EntityRegistry.save(far);
  const store = new RegionalEntityStore(undefined, [EntityRegistry.save(near), farSave]);
  const nearRegion = SimulationRegion.around({ x: 0, y: 24 * TILE, w: 1, h: 1 });
  assert.deepEqual(store.activate(nearRegion).map(entity => entity.view().kind), ['cow']);
  assert.equal(store.stats.sleepingRegionEntities, 1);
  const farRegion = SimulationRegion.around({ x: CHUNK_WIDTH * 4 * TILE, y: 24 * TILE, w: 1, h: 1 });
  const awakened = store.activate(farRegion);
  assert.deepEqual(awakened.map(entity => entity.view().kind), ['wolf']);
  assert.equal(EntityRegistry.save(awakened[0]).health, farSave.health);
  assert.equal(store.stats.sleepingRegionEntities, 1);
});

test('ativação estável preserva instâncias ativas sem tocar regiões históricas', () => {
  const entity = EntityRegistry.create('cow', 0, 24 * TILE, 3)!;
  const historical = Array.from({ length: 600 }, (_, x) => [x + 20, 0, [
    { ...EntityRegistry.save(entity), id: `hist-${x}` },
  ]] as const);
  const store = new RegionalEntityStore(historical);
  const region = SimulationRegion.around({ x: 0, y: 24 * TILE, w: 1, h: 1 });
  store.add(entity);
  const first = store.activate(region);
  const second = store.activate(region);
  assert.equal(first[0], second[0]);
  assert.equal(store.stats.entityRegions, 601);
  assert.equal(store.stats.activeEntityRegions, 1);
  assert.equal(store.stats.sleepingRegionEntities, 600);
});

test('codec preserva todas as regiões e entidades válidas sem truncamento silencioso', () => {
  const prototype = EntityRegistry.save(EntityRegistry.create('cow', 120, 240, 9)!);
  const entityRegions = Array.from({ length: 513 }, (_, region) => [region, 0, [
    ...Array.from({ length: 257 }, (_, entity) => ({ ...prototype, id: `entity-${region}-${entity}` })),
  ]]);
  const save = decodeSave(JSON.stringify({
    version: 4, seed: 'SEM-TRUNCAMENTO', edits: [], slots: Array(36).fill(null),
    player: { x: 0, y: 0, life: 5 }, entityRegions,
  }), 1);
  assert.equal(save.entityRegions?.length, 513);
  assert.equal(save.entityRegions?.at(-1)?.[2].length, 257);
});
