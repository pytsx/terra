import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../src/business/world/World';
import { Expedition } from '../src/business/Expedition';
import { defaultContent } from '../src/assets/runtime';
const recipes = defaultContent.recipes;
import { B, TILE } from '../src/business/catalog';
import { SimulationRegion } from '../src/business/simulation/SimulationRegion';
import { blockPartitionAt } from '../src/business/simulation/BlockPartitionScheduler';

test('comporta controla a passagem de água num canal fechado', () => {
  const world = new World('CANAL'), x = 12, y = 12;
  for (let col = x - 1; col <= x + 3; col++) {
    world.set(col, y + 1, B.BEDROCK, false);
    world.set(col, y, col < x || col > x + 2 ? B.BEDROCK : B.AIR, false);
  }
  world.set(x + 1, y, B.GATE);
  world.hydrology.restore([[x, y, 1000]]);
  const flow = () => {
    for (let i = 0; i < 12; i++) world.hydrology.step(.5, world, x, y, 0, 0);
  };
  flow();
  assert.equal(world.waterStateAt(x + 2, y).volume, 0);
  world.set(x + 1, y, B.GATE_OPEN);
  flow();
  assert.ok(world.waterStateAt(x + 2, y).volume > 0);
});

test('trigo murcho se recupera ao receber água e solo em pousio regenera', () => {
  const world = new World('POUSIO'), x = 10, y = 10;
  for (let row = 0; row < y; row++) world.set(x, row, B.AIR, false);
  world.set(x, y, B.WHEAT_GREEN);
  world.set(x, y + 1, B.FARMLAND);
  const region = SimulationRegion.around({ x: x * TILE, y: y * TILE, w: 1, h: 1 });
  const advance = (row: number, dt: number) => world.evolution.step(dt, world, region, blockPartitionAt(x, row));
  advance(y, 12);
  assert.equal(world.get(x, y), B.WILTED);
  assert.ok(world.hydrology.transferBucket(x, y + 1, B.FARMLAND, true));
  advance(y, 8);
  assert.equal(world.get(x, y), B.WHEAT_GREEN);
  world.set(x, y, B.AIR);
  world.set(x, y + 1, B.FALLOW);
  advance(y + 1, 90);
  assert.equal(world.get(x, y + 1), B.FARMLAND);
});

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
  assert.equal(world.get(x, y), B.WHEAT_GREEN);
  advance();
  assert.equal(world.get(x, y), B.RIPE_WHEAT);
  assert.equal(world.waterStateAt(x, y + 1).volume, 0.08);
});

test('na bancada o jogador fabrica enxada e balde, prepara, irriga e semeia a horta', () => {
  const save = new Expedition('HORTA-OFICINA').save();
  save.player = { ...save.player, x: 10 * TILE, y: 11 * TILE - 30 };
  save.slots.fill(null);
  for (const [i, item] of ['iron', 'wood', 'stone', 'wheatSeed'].entries())
    save.slots[9 + i] = { item, amount: 3 };
  save.entityRegions = [];
  const aim = (x: number, y: number) => ({ x: (x + .5) * TILE, y: (y + .5) * TILE });
  for (let x = 8; x <= 13; x++) {
    for (let y = 0; y < 11; y++) save.edits.push([x, y, B.AIR]);
    save.edits.push([x, 11, B.DIRT]);
  }
  save.edits.push([9, 10, B.WORKBENCH]);
  save.water = [[12, 10, 1000]];
  const game = new Expedition(save.seed, save);
  assert.ok(game.openWorkbench(aim(9, 10)));
  for (const item of ['hoe', 'bucket']) {
    assert.ok(game.fillRecipe(recipes.recipes.findIndex(r => r.output.item === item)));
    assert.equal(game.takeResult()?.item, item);
  }
  game.closeCraft();
  game.select(0);
  assert.ok(game.interactEntity(aim(11, 11)));
  assert.equal(game.world.get(11, 11), B.FARMLAND);
  game.select(1);
  assert.ok(game.interactEntity(aim(12, 10)));
  assert.equal(game.hotbar[1]?.item, 'waterBucket');
  assert.ok(game.interactEntity(aim(11, 11)));
  assert.equal(game.hotbar[1]?.item, 'bucket');
  assert.ok(game.moveStack({ area: 'bag', index: 12 }, { area: 'bag', index: 2 }));
  game.select(2);
  const controls = { aim: aim(11, 10), place: false, mine: false, direction: 0, jump: false, sprint: false };
  game.step(1 / 60, { ...controls, place: true });
  assert.equal(game.world.get(11, 10), B.WHEAT_SHOOT);
  for (let tick = 0; tick < 2700 && game.world.get(11, 10) !== B.RIPE_WHEAT; tick++)
    game.step(1 / 60, controls);
  assert.equal(game.world.get(11, 10), B.RIPE_WHEAT);
  for (let tick = 0; tick < 30 && game.world.get(11, 10) === B.RIPE_WHEAT; tick++)
    game.step(1 / 60, { ...controls, mine: true });
  assert.equal(game.world.get(11, 11), B.FALLOW);
  assert.ok([...game.inventory.slots, ...game.save().drops ?? []].some(stack => stack?.item === 'wheat'));
});
