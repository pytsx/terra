import test from 'node:test';
import assert from 'node:assert/strict';
import { StationStore } from '../src/business/stations/StationStore';
import { ProcessingSystem } from '../src/business/stations/ProcessingSystem';

test('moinho exige trabalho manual, conserva progresso e produz apenas uma vez', () => {
  const store = new StationStore(), system = new ProcessingSystem();
  const mill = store.create('mill', 0, 12);
  const other = store.create('mill', 1, 12);
  assert.notEqual(mill.id, other.id);
  assert.equal(system.insert(mill, 'fuel', { item: 'coal', amount: 1 }), 1);
  assert.equal(system.insert(mill, 'input', { item: 'stone', amount: 1 }), 1);
  assert.equal(system.insert(mill, 'input', { item: 'wheat', amount: 1 }), 0);
  system.step(1, [mill, other]);
  assert.equal(mill.process?.elapsedWork, 0);
  system.setManualWork(mill, true);
  system.step(2, [mill]);
  system.setManualWork(mill, false);
  system.step(10, [mill]);
  assert.equal(mill.process?.elapsedWork, 2);
  const restored = new StationStore(store.save());
  const loaded = restored.getById(mill.id)!;
  assert.equal(loaded.manualWork, false);
  assert.equal(loaded.process?.elapsedWork, 2);
  system.setManualWork(loaded, true);
  system.step(2, [loaded]);
  assert.deepEqual(system.takeOutput(loaded, 0), { item: 'flour', amount: 1 });
  system.step(10, [loaded]);
  assert.equal(system.takeOutput(loaded, 0), null);
  assert.equal(restored.getById(other.id)?.process, null);
});

test('forno desabilitado não inicia lote nem combustível; forno ativo assa e preserva estado', () => {
  const store = new StationStore(), system = new ProcessingSystem();
  const oven = store.create('oven', 0, 12);
  assert.equal(system.insert(oven, 'input', { item: 'dough', amount: 1 }), 0);
  assert.equal(system.insert(oven, 'fuel', { item: 'wood', amount: 1 }), 0);
  oven.enabled = false;
  system.step(1, [oven]);
  assert.equal(oven.process, null);
  assert.equal(oven.energyState.burningFuel, null);
  assert.equal(oven.fuel[0]?.amount, 1);
  oven.enabled = true;
  for (let i = 0; i < 600; i++) system.step(1/60, [oven]);
  assert.equal(oven.output[0], null);
  assert.ok(oven.energyState.burningFuel);
  const restored = new StationStore(store.save()).getById(oven.id)!;
  for (let i = 0; i < 1800; i++) system.step(1/60, [restored]);
  assert.deepEqual(restored.output[0], { item: 'bread', amount: 1 });
});

test('cancelar e remover estação conserva ingredientes sem repetir a recuperação', () => {
  const store = new StationStore(), system = new ProcessingSystem();
  const mill = store.create('mill', -1, 12);
  system.insert(mill, 'input', { item: 'wheat', amount: 3 });
  system.step(1, [mill]);
  assert.equal(system.cancel(mill), true);
  assert.equal(mill.process, null);
  assert.equal(mill.enabled, false);
  assert.deepEqual(store.remove(mill.id), [{ item: 'wheat', amount: 3 }]);
  assert.deepEqual(store.remove(mill.id), []);
  assert.notEqual(store.create('mill', -1, 12).id, mill.id);
});
