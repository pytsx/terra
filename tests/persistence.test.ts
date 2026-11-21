import test from 'node:test';
import assert from 'node:assert/strict';
import { GameService } from '../src/business';
import { LocalStorageRepository } from '../src/store';
import type { ExpeditionSave, SaveRepository } from '../src/business/save';
class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() {
    return this.values.size;
  }
  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
  clear() {
    this.values.clear();
  }
}
test('v2 carrega sem gravar e migra para v4 ao salvar', async () => {
  const storage = new MemoryStorage(),
    repo = new LocalStorageRepository(() => storage);
  const legacy = JSON.stringify({
    v: 2,
    seed: 'ANTIGO',
    edits: [[7000, 11]],
    player: { x: 0, y: 10, life: 3, placed: 8, depthMax: 7, inv: { wood: 0, torch: 21 } },
    elapsed: 765,
    selected: 4,
  });
  storage.setItem('terra-matriz-save-v2', legacy);
  storage.setItem('terra-matriz-zoom', '1.31');
  const service = await GameService.open(repo),
    save = service.game.save();
  assert.equal(storage.length, 2);
  assert.ok(!save.slots.some((s) => s?.item === 'wood'));
  assert.equal(save.slots[5]?.amount, 21);
  assert.equal(save.player.x, 0);
  assert.equal(save.player.life, 3);
  assert.equal(save.player.placed, 8);
  assert.equal(save.player.depthMax, 7);
  assert.equal(save.elapsed, 765);
  assert.equal(save.zoom, 1.31);
  assert.equal(save.selected, 4);
  assert.equal(service.game.world.get(0, 10), 11);
  await service.save();
  assert.equal(storage.getItem('terra-matriz-save-v2'), legacy);
  assert.deepEqual((await GameService.open(repo)).game.save(), save);
});
test('v3 mantém atalhos, quantidades, melhorias e o registro original', async () => {
  const storage = new MemoryStorage(),
    repo = new LocalStorageRepository(() => storage);
  const original = JSON.stringify({
    version: 3,
    seed: 'OFICINA',
    player: { x: 10, y: 24, life: 4 },
    edits: [],
    selected: 4,
    zoom: 1.4,
    stock: { plank: 2048, stone: 0, coal: 17 },
    upgrades: ['lantern', 'copperPick'],
  });
  storage.setItem('terra-matriz-save-v3', original);
  const service = await GameService.open(repo);
  assert.equal(service.game.inventory.slots[4]?.amount, 2048);
  assert.ok(
    service.game.scene({ x: 0, y: 0 }).lantern && service.game.scene({ x: 0, y: 0 }).copperPick,
  );
  assert.equal(service.game.inventory.slots[2], null);
  assert.equal(service.game.slot, 4);
  await service.save();
  assert.equal(storage.getItem('terra-matriz-save-v3'), original);
  assert.deepEqual((await GameService.open(repo)).game.save(), service.game.save());
});
test('falha de leitura preserva os dados e a sessão pode funcionar em memória', async () => {
  const storage = new MemoryStorage();
  storage.setItem('terra-matriz-save-v3', '{');
  const service = await GameService.open(new LocalStorageRepository(() => storage));
  assert.ok(service.loadFailed);
  assert.equal(storage.getItem('terra-matriz-save-v3'), '{');
  assert.ok(service.game.moveStack({ area: 'bag', index: 3 }, { area: 'grid', index: 0 }));
});
test('provedor assíncrono mantém a ordem e aceita nova gravação após falha', async () => {
  const calls: string[] = [];
  let rejectFirst!: (reason: Error) => void;
  const repo: SaveRepository = {
    async load() {
      return null;
    },
    write(save: ExpeditionSave) {
      calls.push(save.seed);
      if (calls.length === 1)
        return new Promise((_, reject) => {
          rejectFirst = reject;
        });
      return Promise.resolve();
    },
  };
  const service = await GameService.open(repo);
  const first = service.save();
  service.newWorld('SEGUNDO');
  const second = service.save();
  assert.deepEqual(calls, ['AURORA-1264']);
  rejectFirst(new Error('offline'));
  await assert.rejects(first);
  await second;
  assert.deepEqual(calls, ['AURORA-1264', 'SEGUNDO']);
});
