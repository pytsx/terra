import test from 'node:test';
import assert from 'node:assert/strict';
import { Expedition, type Controls } from '../src/business/Expedition';
import { Inventory } from '../src/business/inventory/Inventory';
import { B, TILE, LEGACY_WORLD_H } from '../src/business/catalog';
import { World } from '../src/business/world/World';
import { Camera } from '../src/render/Camera';
import { decodeSave } from '../src/store/codec';
import { defaultContent } from '../src/assets/runtime';

const idle: Controls = {
  aim: { x: 600, y: 245 }, direction: 0, jump: false, sprint: false, mine: false, place: false,
};

function site() {
  const save = new Expedition('ARENA').save();
  save.player = { ...save.player, x: 10 * TILE, y: 11 * TILE - 30 };
  save.slots.fill(null);
  for (let x = 8; x < 18; x++) {
    save.edits.push([x, 9, B.AIR], [x, 10, B.AIR], [x, 11, B.STONE]);
  }
  return save;
}

test('minerar à distância gera um drop persistente, coletado uma vez ao aproximar', () => {
  const save = site();
  save.edits.push([12, 10, B.STONE]);
  save.slots[0] = { item: 'crystalPick', amount: 1, durability: 1 };
  const game = new Expedition(save.seed, save);
  const edits: number[] = [];
  const stop = game.world.onBlockEdited(edit => {
    if (edit.x === 12 && edit.y === 10) {
      assert.equal(edit.previous, B.STONE);
      assert.equal(game.world.get(12, 10), edit.block);
      assert.equal(game.world.damageAt(12, 10), 0);
      assert.equal(game.world.mapPeek(12, 10), edit.block);
      edits.push(edit.block);
    }
  });
  assert.equal(game.scene(idle.aim).swing, null);
  game.step(1 / 60, { ...idle, mine: true });
  assert.equal(game.scene(idle.aim).swing?.item, 'crystalPick');
  for (let i = 0; i < 60 && game.world.get(12, 10) !== B.AIR; i++)
    game.step(1 / 60, { ...idle, mine: true });
  assert.equal(game.world.get(12, 10), B.AIR);
  assert.deepEqual(edits, [B.AIR]);
  stop();
  assert.equal(game.hotbar[0], null);
  assert.equal(game.save().drops?.[0].item, 'stone');
  assert.ok(game.inventory.slots.every((slot) => !slot));
  const restored = new Expedition(save.seed, decodeSave(JSON.stringify(game.save()), 1));
  for (let i = 0; i < 25; i++) restored.step(1 / 60, { ...idle, direction: 1 });
  assert.deepEqual(restored.save().drops, []);
  assert.deepEqual(restored.inventory.slots.filter(Boolean), [{ item: 'stone', amount: 1 }]);
});

test('a mão bloqueada pela dureza da pedra não produz golpe nem impacto', () => {
  const save = site();
  save.edits.push([11, 10, B.STONE]);
  const game = new Expedition(save.seed, save);
  game.step(1 / 60, { ...idle, mine: true });
  assert.equal(game.scene(idle.aim).toolTarget?.secondsLeft, null);
  assert.equal(game.scene(idle.aim).swing, null);
  assert.equal(game.world.damageAt(11, 10), 0);
  assert.deepEqual(game.drainEvents(), []);
});

test('descartar, recarregar e recolher preserva desgaste e a quantidade integral das pilhas', () => {
  const save = site();
  const tool = { item: 'pickaxe', amount: 1, durability: 3 };
  save.slots[0] = tool;
  save.drops = [{ item: 'wood', amount: 7, x: save.player.x, y: save.player.y + 12 }];
  const game = new Expedition(save.seed, save);
  assert.ok(game.dropSelected());
  const persisted = decodeSave(JSON.stringify(game.save()), 1);
  assert.equal(persisted.drops?.find((drop) => drop.item === tool.item)?.durability, 3);
  const loaded = new Expedition(save.seed, persisted);
  for (let i = 0; i < 4; i++) {
    loaded.step(1 / 60, idle);
    game.step(1 / 60, idle);
    assert.deepEqual(loaded.save().drops, game.save().drops);
  }
  assert.equal(loaded.save().drops?.length, 1);
  for (let i = 0; i < 32; i++) loaded.step(1 / 60, { ...idle, direction: 1 });
  assert.deepEqual(loaded.inventory.slots.filter(Boolean), [{ item: 'wood', amount: 7 }, tool]);
  assert.deepEqual(loaded.save().drops, []);
});

test('duas ferramentas com desgaste diferente podem trocar de slot sem fundir', () => {
  const a = { item: 'pickaxe', amount: 1, durability: 8 };
  const b = { ...a, durability: 42 };
  const bag = new Inventory(defaultContent.recipes, defaultContent.materials, [a, b]);
  assert.ok(bag.move({ area: 'bag', index: 0 }, { area: 'bag', index: 1 }));
  assert.deepEqual(bag.saveSlots(), [b, a]);
});

test('fechar a mochila resolve a transação cheia como drop persistente', () => {
  const save = site();
  save.slots = Array.from({ length: 36 }, () => ({ item: 'wood', amount: 1 }));
  save.slots[0] = { item: 'wood', amount: 5 };
  const game = new Expedition(save.seed, save);
  assert.ok(game.clickStack({ area: 'bag', index: 0 }));
  assert.ok(game.distributeStack([
    { area: 'bag', index: 0 },
    { area: 'bag', index: 1 },
  ]));
  assert.equal(game.cursorStack?.amount, 1);
  game.closeCraft();
  assert.equal(game.cursorStack, null);
  assert.equal(game.scene(idle.aim).drops.length, 1);
  assert.deepEqual(game.save().drops?.[0], {
    item: 'wood',
    amount: 1,
    x: game.player.x + game.player.w / 2,
    y: game.player.y + game.player.h / 2,
    vx: game.player.face * 35,
    vy: -45,
    pickupDelay: 0.35,
  });
});

test('o botão direito só abre a bancada apontada se o trajeto estiver livre', () => {
  const save = site();
  const aim = { x: 12.5 * TILE, y: 10.5 * TILE };
  save.edits.push([12, 10, B.WORKBENCH], [11, 10, B.STONE]);
  assert.equal(new Expedition(save.seed, save).openWorkbench(aim), false);
  save.edits.push([11, 10, B.AIR]);
  assert.equal(new Expedition(save.seed, save).openWorkbench(aim), true);
});

test('zoom, recorte e mira compartilham o centro em mundos infinitos e os limites do legado', () => {
  const cam = new Camera(960, 540), focus = { x: -128000, y: 2000 };
  const world = { width: 700, height: LEGACY_WORLD_H, infinite: true };
  for (const zoom of [0.7, 1, 1.65]) {
    cam.follow(focus, world, zoom, Infinity);
    assert.deepEqual(cam.toWorld({ x: 0.5, y: 0.5 }, zoom), focus);
    const bounds = cam.bounds(zoom);
    assert.deepEqual(cam.toWorld({ x: 0, y: 0 }, zoom), { x: bounds.left, y: bounds.top });
    const end = cam.toWorld({ x: 1, y: 1 }, zoom);
    assert.ok(Math.abs(end.x - bounds.left - bounds.width) < 1e-8);
    cam.follow({ x: -100, y: 9000 }, { ...world, infinite: false }, zoom, Infinity);
    assert.ok(Math.abs(cam.bounds(zoom).left) < 1e-8);
    assert.equal(Math.round(cam.toWorld({ x: 0, y: 1 }, zoom).y), LEGACY_WORLD_H * TILE);
  }
});

test('o mapa registra só células vistas e uma edição distante sobrevive à recarga sem truncar x', () => {
  const world = new World('HORIZONTE');
  world.exploreAround(0, 50);
  const before = world.exploredBounds();
  world.set(62, 51, B.GOLD);
  assert.equal(world.mapPeek(62, 51), undefined);
  const farX = -(2 ** 32) - 7;
  world.importEdits([[farX, 50, B.BRICK]]);
  const restored = new World(world.seed);
  restored.importExploration(world.exportExploration());
  restored.importEdits(world.exportEdits());
  restored.restoreDamage([[farX, 50, 0.45]]);
  assert.equal(restored.loadedChunks, 0);
  assert.deepEqual(restored.exportDamage(), [[farX, 50, 0.45]]);
  assert.deepEqual(restored.exploredBounds(), before);
  assert.equal(restored.mapPeek(62, 51), undefined);
  assert.equal(restored.get(farX, 50), B.BRICK);
  assert.equal(restored.damageAt(farX, 50), 0.45);
  assert.notEqual(restored.get(-7, 50), B.BRICK);
  restored.exploreAround(62, 51);
  assert.equal(restored.mapPeek(62, 51), B.GOLD);
});

test('a queda de areia recomeça quando o chunk do save volta à simulação', () => {
  const world = new World('QUEDA');
  world.importEdits([[-5, 5, B.SAND], [-5, 6, B.AIR], [-5, 7, B.STONE]]);
  assert.equal(world.loadedChunks, 0);
  assert.equal(world.get(-5, 5), B.SAND);
  world.stepGravity(0.081, () => false, () => {});
  assert.equal(world.get(-5, 5), B.AIR);
  assert.equal(world.get(-5, 6), B.SAND);
});
