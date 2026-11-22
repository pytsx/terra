import test from 'node:test';
import assert from 'node:assert/strict';
import { B, TILE, WORLD_W } from '../src/business/catalog';
import { World } from '../src/business/world/World';
import { defaultContent } from '../src/assets/runtime';
const entities = defaultContent.entities;
import { Actor } from '../src/business/entities/Actor';
import { tracePlacement, traceTool } from '../src/business/toolTarget';
import { Expedition } from '../src/business/Expedition';
import { decodeSave } from '../src/store/codec';
import { RNG } from '../src/shared/math';
import { rainIntensity } from '../src/business/weather';
import { rainDropCount } from '../src/render/Rain';

test('o primeiro contato no rumo do golpe vence entre blocos e criaturas', () => {
  const world = new World('AURORA-1264'),
    player = { x: 240, y: 225, w: 18, h: 30, vx: 0, face: 1, ground: true };
  const aim = { x: 600, y: 240 };
  const behind = entities.create('cow', 200, 230, 0)!,
    front = entities.create('cow', 270, 230, 0)!,
    far = entities.create('wolf', 300, 230, 0)!;
  const trace = () => traceTool(world, player, aim, 80, [far, behind, front]).hit;
  const first = trace();
  assert.equal(first?.kind, 'entity');
  assert.ok(first?.kind === 'entity' && first.entity === front);
  world.set(11, 10, B.BEDROCK);
  const wall = trace();
  assert.ok(wall?.kind === 'block' && wall.id === B.BEDROCK);
  world.set(11, 10, B.AIR);
  world.set(12, 10, B.STONE);
  assert.equal(trace()?.kind, 'entity');
  assert.equal(traceTool(world, player, aim, 12, [front]).hit, null);
  player.face = -1;
  assert.equal(traceTool(world, player, aim, 80, [far, front]).hit, null);
  const left = traceTool(world, player, { x: 0, y: 240 }, 80, [behind, front]).hit;
  assert.ok(left?.kind === 'entity' && left.entity === behind);
});

test('construção usa exatamente a célula apontada pela mira', () => {
  const world = new World('PILAR-DIRECIONAL');
  for (let x = 6; x <= 14; x++)
    for (let y = 4; y <= 13; y++) world.set(x, y, B.AIR, false);
  world.set(10, 10, B.STONE, false);
  const player = { x: 10 * TILE + 3, y: 7 * TILE, w: 18, h: 30, vx: 0, face: 1, ground: false };
  const centerX = player.x + player.w / 2, centerY = player.y + player.h / 2;
  const downward = tracePlacement(world, player, { x: centerX, y: 11.5 * TILE }, TILE * 5.35);
  assert.deepEqual(downward.target, { tx: 10, ty: 11 });
  assert.equal(downward.reachable, true);
  assert.deepEqual(downward.support && { tx: downward.support.tx, ty: downward.support.ty }, { tx: 10, ty: 10 });

  const far = tracePlacement(world, player, { x: centerX, y: centerY + 500 }, TILE * 5.35);
  assert.deepEqual(far.target, { tx: 10, ty: 28 });
  assert.equal(far.reachable, false);

  const approached = tracePlacement(world, player, { x: centerX, y: centerY + 500 },
    TILE * 5.35, 'approach');
  assert.deepEqual(approached.target, { tx: 10, ty: 9 });
  assert.equal(approached.reachable, true);
});

test('a trinca, o save e a quebra usam exatamente o mesmo dano após uma pausa', () => {
  const save = new Expedition('AURORA-1264').save(),
    x = 100,
    y = 10;
  save.slots[0] = { item: 'copperPick', amount: 1 };
  save.player = { ...save.player, x: x * TILE, y: (y + 1) * TILE - 30 };
  save.edits.push(
    [(y + 1) * WORLD_W + x, B.STONE],
    [y * WORLD_W + x + 1, B.STONE],
    [y * WORLD_W + x + 2, B.DIRT],
  );
  const aim = { x: (x + 3) * TILE, y: save.player.y + 15 },
    input = { aim, mine: true, place: false, direction: 0, jump: false, sprint: false };
  const game = new Expedition(save.seed, save);
  for (let i = 0; i < 18; i++) game.step(1 / 60, input);
  const damaged = game.world.damageAt(x + 1, y);
  assert.ok(Math.abs(damaged - ((18 / 60) * 1.6) / 0.77) < 1e-8);
  assert.equal(game.world.damageAt(x + 2, y), 0);
  for (let i = 0; i < 120; i++) game.step(1 / 60, { ...input, mine: false });
  assert.equal(game.world.damageAt(x + 1, y), damaged);
  const persisted = decodeSave(JSON.stringify(game.save()), 1);
  const restored = new Expedition(save.seed, persisted);
  assert.equal(restored.world.damageAt(x + 1, y), damaged);
  for (let i = 0; i < 10; i++) restored.step(1 / 60, input);
  assert.equal(restored.world.get(x + 1, y), B.STONE);
  restored.step(1 / 60, input);
  assert.equal(restored.world.get(x + 1, y), B.AIR);
  assert.equal(restored.world.damageAt(x + 1, y), 0);
  assert.equal(restored.world.get(x + 2, y), B.DIRT);
});

test('areia empilhada cai após perder apoio, atravessa decoração e carrega as rachaduras', () => {
  const w = new World('AURORA-1264'),
    x = 20,
    y = 8;
  w.set(x, y, B.SAND);
  w.set(x, y + 1, B.SAND);
  w.set(x, y + 2, B.STONE);
  w.set(x, y + 4, B.TORCH);
  w.set(x, y + 6, B.BEDROCK);
  const damage = w.mine(x, y, 0.05);
  let dislodged = 0;
  const advance = () =>
    w.stepGravity(
      0.081,
      () => false,
      (id) => {
        if (id === B.TORCH) dislodged++;
      },
    );
  advance();
  assert.equal(w.get(x, y), B.SAND);
  w.set(x, y + 2, B.AIR);
  for (let i = 0; i < 10; i++) advance();
  assert.equal(w.get(x, y), B.AIR);
  assert.equal(w.get(x, y + 3), B.AIR);
  assert.equal(w.get(x, y + 4), B.SAND);
  assert.equal(w.get(x, y + 5), B.SAND);
  assert.equal(w.get(x, y + 6), B.BEDROCK);
  assert.equal(dislodged, 1);
  assert.equal(w.damageAt(x, y + 4), damage);
  const loaded = new World(w.seed);
  loaded.importEdits(w.exportEdits());
  loaded.restoreDamage(w.exportDamage());
  assert.equal(loaded.get(x, y + 5), B.SAND);
  assert.equal(loaded.damageAt(x, y + 4), damage);
});

test('árvore natural é atravessável e minerável, enquanto madeira colocada continua sólida', () => {
  const world = new World('ARVORES-ATRAVESSAVEIS');
  const naturalX = 40, y = 20, placedX = 42;
  world.set(naturalX, y, B.WOOD, false);
  world.set(naturalX, y - 1, B.LEAF, false);
  world.set(placedX, y, B.WOOD);

  assert.equal(world.get(naturalX, y), B.WOOD);
  assert.equal(world.solid(naturalX, y), false);
  assert.equal(world.collides(naturalX * TILE, y * TILE, 18, 30), false);
  assert.equal(world.solid(placedX, y), true);
  assert.equal(world.collides(placedX * TILE, y * TILE, 18, 20), true);

  assert.equal(world.mine(naturalX, y, 1), 1);
  assert.equal(world.get(naturalX, y), B.AIR);

  const restored = new World(world.seed);
  restored.importEdits(world.exportEdits());
  assert.equal(restored.get(placedX, y), B.WOOD);
  assert.equal(restored.solid(placedX, y), true);
});

test('entidades usam a mesma passagem livre nas árvores naturais', () => {
  class Walker extends Actor {
    constructor(x: number, y: number) { super(x, y, 18, 20); }
    walk(world: World) {
      this.vx = 120;
      this.move(0.25, world);
      return this.view().x;
    }
  }
  const world = new World('MOB-NA-FLORESTA');
  const y = 20;
  world.set(11, y, B.WOOD, false);
  const throughTree = new Walker(10 * TILE, y * TILE).walk(world);
  assert.ok(throughTree > 11 * TILE);
  world.set(11, y, B.WOOD);
  const blockedByBuild = new Walker(10 * TILE, y * TILE).walk(world);
  assert.ok(blockedByBuild < 11 * TILE);
});

test('chuva tem ciclos determinísticos, some no subsolo e limita gotas ao redor da tela', () => {
  const seed = 98172;
  const rainyTime = Array.from({ length: 2_000 }, (_, index) => index)
    .find((elapsed) => rainIntensity(elapsed, seed, 0) > 0.5);
  assert.notEqual(rainyTime, undefined);
  const strength = rainIntensity(rainyTime!, seed, 0);
  assert.equal(rainIntensity(rainyTime!, seed, 0), strength);
  assert.equal(rainIntensity(rainyTime!, seed, 5), 0);
  assert.equal(rainDropCount(320, 180), 48);
  assert.equal(rainDropCount(7680, 4320), 180);
});
for (const kind of ['slime', 'wolf', 'cow']) {
  test(kind + ' salta e pousa em um degrau inteiro', () => {
    const w = new World('AURORA-1264'),
      rng = new RNG(17);
    const floor = 12,
      edge = 24;
    for (let x = 12; x < 45; x++) {
      w.set(x, floor, B.STONE);
      if (x >= edge) w.set(x, floor - 1, B.STONE);
    }
    const height = entities.asset(kind).config.height;
    const mob = entities.create(kind, (edge - 2) * TILE, floor * TILE - height, 1)!;
    const player = {
      x: (kind === 'cow' ? edge - 3 : edge + 3) * TILE,
      y: floor * TILE - 30,
      w: 18,
      h: 30,
      vx: 0,
      ground: true,
      face: 1,
    };
    let crossed = false;
    for (let i = 0; i < 500; i++) {
      mob.step(1 / 60, w, player, rng);
      const m = mob.view();
      assert.ok(!w.collides(m.x, m.y, m.w, m.h));
      if (m.ground && m.x + m.w > edge * TILE && Math.abs(m.y + m.h - (floor - 1) * TILE) < 0.1) {
        crossed = true;
        break;
      }
    }
    assert.ok(crossed);
  });
}
