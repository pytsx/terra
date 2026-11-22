import test from 'node:test';
import assert from 'node:assert/strict';
import { Expedition, type Controls } from '../src/business/Expedition';
import { B, TILE, WORLD_W, WORLD_H } from '../src/business/catalog';
import { World } from '../src/business/world/World';
import { startingSlots } from '../src/business/inventory/Inventory';
import { defaultContent } from '../src/assets/runtime';
import { Explorer } from '../src/business/entities/Explorer';
const idle: Controls = {
  direction: 0,
  sprint: false,
  jump: false,
  mine: false,
  place: false,
  aim: { x: 0, y: 0 },
};
function advance(game: Expedition, steps: number, input: Controls = idle) {
  for (let i = 0; i < steps; i++) game.step(1 / 60, input);
}
test('o mapa original AURORA-1264 conserva todas as células da v2', () => {
  const world = new World('AURORA-1264', 1);
  let checksum = 2166136261;
  for (let y = 0; y < 158; y++)
    for (let x = 0; x < WORLD_W; x++) checksum = Math.imul(checksum ^ world.get(x, y), 16777619);
  assert.equal(checksum >>> 0, 4254747726);
});
test('a prévia de colocação exige que o bloco esteja selecionado na mão', () => {
  const game = new Expedition('BLOCO-NA-MAO');
  const tx = Math.floor(game.player.x / TILE), ty = game.world.heightAt(tx) - 1;
  const aim = { x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE };
  const withTool = game.target(aim);
  assert.equal(withTool.tile, undefined);
  assert.equal(withTool.canPlace, false);
  game.select(1);
  const withBlock = game.target(aim);
  assert.equal(withBlock.tile, B.DIRT);
  assert.equal(withBlock.canPlace, true);
});
test('o cursor define a direção visual mesmo quando o jogador anda de costas', () => {
  const game = new Expedition('PASSO-DE-COSTAS');
  const right = { x: game.player.x + 300, y: game.player.y };
  advance(game, 8, { ...idle, direction: -1, aim: right });
  assert.equal(game.player.face, 1);
  assert.ok(game.player.vx < 0);
  const left = { x: game.player.x - 300, y: game.player.y };
  advance(game, 16, { ...idle, direction: 1, aim: left });
  assert.equal(game.player.face, -1);
  assert.ok(game.player.vx > 0);
});
function miningSite() {
  const initial = new Expedition('AURORA-1264');
  advance(initial, 90);
  const save = initial.save(),
    tx = Math.floor(save.player.x / TILE) + 1,
    ty = Math.floor((save.player.y + 15) / TILE);
  save.edits.push([ty * WORLD_W + tx, B.GRASS], [(ty + 1) * WORLD_W + tx, B.STONE]);
  return { game: new Expedition(save.seed, save), tx, ty };
}
test('a mão não minera pedra e a picareta de madeira minera', () => {
  const initial = new Expedition('PROGRESSAO-MINERAL');
  advance(initial, 30);
  const save = initial.save(), tx = Math.floor(save.player.x / TILE) + 1,
    ty = Math.floor((save.player.y + 15) / TILE);
  save.edits.push([tx, ty, B.STONE]);
  save.slots = save.slots.map(() => null);
  const bare = new Expedition(save.seed, save);
  const aim = { x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE };
  advance(bare, 180, { ...idle, aim, mine: true });
  assert.equal(bare.world.get(tx, ty), B.STONE);
  const equippedSave = bare.save();
  equippedSave.slots[0] = { item: 'pickaxe', amount: 1, durability: 96 };
  const equipped = new Expedition(save.seed, equippedSave);
  advance(equipped, 90, { ...idle, aim, mine: true });
  assert.equal(equipped.world.get(tx, ty), B.AIR);
});
test('mineração, construção, custos e alterações do terreno sobrevivem ao carregamento', () => {
  const { game, tx, ty } = miningSite();
  const aim = { x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE };
  assert.equal(game.world.get(tx, ty), B.GRASS);
  advance(game, 30, { ...idle, aim, mine: true });
  assert.equal(game.world.get(tx, ty), B.AIR);
  assert.equal(game.inventory.slots[1]?.amount, 31);
  game.select(2);
  assert.equal(game.target(aim).canPlace, true);
  advance(game, 1, { ...idle, aim, place: true });
  assert.equal(game.world.get(tx, ty), B.STONE);
  assert.equal(game.inventory.slots[2]?.amount, 11);
  assert.equal(game.player.placed, 1);
  advance(game, 30, { ...idle, aim, place: true });
  assert.equal(game.inventory.slots[2]?.amount, 11);
  const restored = new Expedition(game.world.seed, game.save());
  assert.deepEqual(restored.save(), game.save());
  assert.equal(restored.world.get(tx, ty), B.STONE);
});
test('melhorias modificam mineração e iluminação e permanecem equipadas', () => {
  const { game: base, tx: x, ty: y } = miningSite();
  const saved = base.save();
  saved.slots = startingSlots({ copper: 4, crystal: 2 }, [], defaultContent.materials);
  const tx = Math.floor(base.player.x / TILE) - 1,
    ty = base.world.heightAt(tx) - 1;
  saved.edits.push([ty * WORLD_W + tx, B.WORKBENCH]);
  const geared = new Expedition(saved.seed, saved);
  const aimTable = { x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE };
  assert.ok(geared.openWorkbench(aimTable));
  function fill(pattern: (string | null)[]) {
    pattern.forEach((item, index) => {
      if (item === null) return;
      const source = geared.inventory.slots.findIndex((s) => s?.item === item);
      assert.ok(geared.moveStack({ area: 'bag', index: source }, { area: 'grid', index }));
    });
  }
  fill([null, 'torch', null, 'torch', 'crystal', 'torch', null, 'crystal', null]);
  assert.equal(geared.takeResult()?.item, 'lantern');
  fill(['copper', 'copper', 'copper', 'wood', 'copper', 'wood', null, 'wood', null]);
  assert.equal(geared.takeResult()?.item, 'copperPick');
  geared.closeCraft();
  const copperPickSlot = geared.inventory.slots.findIndex((slot) => slot?.item === 'copperPick');
  assert.ok(copperPickSlot >= 0);
  assert.ok(geared.moveStack({ area: 'bag', index: copperPickSlot }, { area: 'bag', index: 0 }));
  geared.select(0);
  const aim = { x: (x + 0.5) * TILE, y: (y + 0.5) * TILE };
  advance(base, 13, { ...idle, aim, mine: true });
  advance(geared, 13, { ...idle, aim, mine: true });
  assert.equal(base.world.get(x, y), B.GRASS);
  assert.equal(geared.world.get(x, y), B.AIR);
  const restored = new Expedition(saved.seed, geared.save());
  assert.ok(restored.scene(aim).lantern);
  assert.ok(restored.scene(aim).copperPick);
});
test('corrida, salto e colisão compartilham o terreno do mundo', () => {
  const world = new World('AURORA-1264'),
    x = 200,
    y = 39;
  for (let cx = x - 1; cx < x + 12; cx++)
    for (let cy = y - 5; cy <= y; cy++) world.set(cx, cy, cy === y ? B.STONE : B.AIR);
  const initial = { x: x * TILE, y: y * TILE - 30, life: 5, depthMax: 0, placed: 0 };
  const normal = new Explorer(world, initial),
    fast = new Explorer(world, initial);
  for (let k = 0; k < 36; k++) {
    normal.step(1 / 60, { ...idle, direction: 1 }, world);
    fast.step(1 / 60, { ...idle, direction: 1, sprint: true }, world);
  }
  assert.ok(fast.view().x > normal.view().x + 25);
  assert.equal(fast.view().ground, true);
  fast.step(1 / 60, { ...idle, jump: true }, world);
  assert.ok(fast.view().y < initial.y);
  for (let k = 0; k < 80; k++) fast.step(1 / 60, idle, world);
  assert.equal(fast.view().y, initial.y);
});
