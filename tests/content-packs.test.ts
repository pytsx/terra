import assert from 'node:assert/strict';
import test from 'node:test';
import { B, TILE, placedTile } from '../src/business/catalog';
import { Expedition } from '../src/business/Expedition';
import { recipes } from '../src/business/craft/RecipeBook';
import { EntityRegistry } from '../src/business/entities/EntityRegistry';
import { SimulationRegion } from '../src/business/simulation/SimulationRegion';
import { blockPartitionAt } from '../src/business/simulation/BlockPartitionScheduler';
import { World } from '../src/business/world/World';
import { decodeSave } from '../src/store/codec';
import { StationStore } from '../src/business/stations/StationStore';
import { extendItems } from '../src/business/content/ContentCompiler';
import { compileSurfaceScatter } from '../src/business/worldgen/SurfaceScatter';
import { TransformationRegistry } from '../src/business/simulation/TransformationRegistry';
import type { TransformationAsset } from '../src/assets';

test('compilação rejeita colisão com o catálogo, substrato ausente e efeito desconhecido', () => {
  assert.throws(() => extendItems([{ id: 'test:invalid', schemaVersion: 1,
    items: { flour: { name: 'Duplicada' } } }], { flour: {} }), /test:invalid.*flour/);
  assert.throws(() => compileSurfaceScatter([{ id: 'unknown-soil', block: 'HERB_SHOOT',
    substrate: 'MISSING', sinceGeneration: 6, minHumidity: 0.2, probability: 1 }]), /unknown-soil/);
  assert.throws(() => new TransformationRegistry([{ id: 'unknown-action', source: 'GRASS',
    duration: { seconds: 1, mode: 'continuous' }, conditions: { property: 'water.volume', operator: '>', value: 0 },
    action: { type: 'unexpected' } } as unknown as TransformationAsset]), /Efeito desconhecido/);
});

test('a campina e as flores aparecem na geração nova e preservam o terreno anterior', () => {
  const world = new World('CAMPO-MEDICINAL'), original = new World(world.seed, 5);
  let flower = false, meadow = false;
  for (let x = -2048; x < 2048 && !(flower && meadow); x++) {
    if (world.biomeAt(x) === 'Campina úmida') {
      assert.equal(original.biomeAt(x), 'Pradaria');
      meadow = true;
    }
    const y = world.heightAt(x) - 1;
    if (world.get(x, y) === B.FLOWERING_HERB) {
      assert.equal(world.get(x, y + 1), B.GRASS);
      assert.equal(original.get(x, y), B.AIR);
      flower = true;
    }
  }
  assert.ok(flower && meadow);
});

test('broto replantado exige grama úmida e luz para florescer', () => {
  const world = new World('REPLANTIO'), x = 8, y = 10;
  world.set(x, y + 1, B.GRASS);
  world.set(x, y, placedTile('herbSeed')!);
  const region = SimulationRegion.around({ x: x*TILE, y: y*TILE, w: 1, h: 1 });
  const advance = () => world.evolution.step(18, world, region, blockPartitionAt(x, y));
  advance();
  assert.equal(world.get(x, y), B.HERB_SHOOT);
  world.hydrology.restore([[x, y + 1, 200]]);
  world.set(x, y - 1, B.STONE);
  advance();
  assert.equal(world.get(x, y), B.HERB_SHOOT);
  world.set(x, y - 1, B.AIR);
  advance();
  assert.equal(world.get(x, y), B.FLOWERING_HERB);
  assert.equal(world.waterStateAt(x, y + 1).volume, 0.17);
});

test('colheita, almofariz, recarga de um lote, fabricação e cura pelos comandos do jogador', () => {
  const save = new Expedition('HERBALISMO').save(), x = 12, floor = 12;
  save.player = { ...save.player, x: x*TILE, y: floor*TILE - 30, life: 2 };
  save.slots.fill(null);
  save.slots[0] = { item: 'flour', amount: 1 };
  save.entityRegions = [];
  for (let col = x - 3; col <= x + 3; col++) {
    for (let y = 0; y < floor; y++) save.edits.push([col, y, B.AIR]);
    save.edits.push([col, floor, B.GRASS]);
  }
  save.edits.push([x+1, floor-1, B.FLOWERING_HERB], [x-1, floor-1, B.MORTAR]);
  let game = new Expedition(save.seed, save);
  const aimAt = (col: number) => ({x: (col+.5)*TILE, y: (floor-.5)*TILE});
  const controls = { direction: 0, sprint: false, jump: false, place: false, mine: true, aim: aimAt(x+1) };
  for (let i=0; i<20; i++) game.step(1/60, controls);
  assert.equal(game.world.get(x+1, floor-1), B.AIR);
  for (let i=0; i<60; i++) game.step(1/60, { ...controls, mine: false });
  const slotOf = (item: string) => game.inventory.slots.findIndex(s => s?.item === item);
  assert.equal(game.inventory.slots[slotOf('herbSeed')]?.amount, 2);
  const aim = aimAt(x-1);
  assert.ok(game.openWorkbench(aim));
  const station = game.stationModel!.id;
  game.clickStack({ area: 'bag', index: slotOf('herb') });
  assert.ok(game.stationAction(station, 'slot', 'input', 0));
  game.stationAction(station, 'start');
  const advance = (ticks: number) => {
    for (let i=0; i<ticks; i++) game.step(1/60, { ...controls, mine: false, aim });
  };
  advance(60);
  const restored = decodeSave(JSON.stringify(game.save()), 1);
  game = new Expedition(restored.seed, restored);
  assert.ok(game.openWorkbench(aim));
  assert.ok(game.stationModel!.progress > 0 && game.stationModel!.progress < 1);
  assert.equal(game.stationModel!.manualWork, false);
  game.stationAction(station, 'start');
  advance(121);
  assert.ok(game.stationAction(station, 'slot', 'output', 0));
  game.clickStack({ area: 'bag', index: 8 });
  game.closeCraft();
  assert.ok(game.fillRecipe(recipes.recipes.findIndex(r => r.output.item === 'poultice')));
  assert.equal(game.takeResult()?.item, 'poultice');
  game.select(slotOf('poultice'));
  const life = game.player.life;
  assert.ok(game.consumeSelected());
  assert.ok(game.player.life > life);
});

test('espécie do pacote usa o habitat, a prioridade de fuga e a persistência de organismos', () => {
  const deer = EntityRegistry.create('marshDeer', 100, 200, 42)!;
  const saved = EntityRegistry.save(deer);
  assert.deepEqual(EntityRegistry.save(EntityRegistry.restore(saved)!), saved);
  const weight = (biome: string) => EntityRegistry.spawnPool(B.GRASS, biome).find(s => s.id === 'marshDeer')!.weight;
  assert.equal(weight('Campina úmida'), 2 * weight('Pradaria'));
  const species = EntityRegistry.asset('marshDeer')!;
  assert.ok('act' in species.script);
  const habitat = {
    night: true, rainy: false, depth: 0, face: 1, homeDistance: 0, depthBelowHome: 0, clock: 0,
    rememberHome() {}, flee: (id: string) => id === 'wolf', is: () => false, change: () => false,
    hunt: () => undefined,
  };
  assert.equal(species.script.act(habitat), 'flee');
  assert.equal(species.script.act({ ...habitat, flee: () => false }), 'rest');
});

test('roda só mói trigo quando a hidrologia transfere água sob o moinho', () => {
  const initial = new Expedition('RODA').save(), x = 12, y = 12;
  initial.player = { ...initial.player, x: (x-1)*TILE, y: (y+1)*TILE-30 };
  initial.entityRegions = [];
  for (let col=x-2; col<=x+2; col++) {
    for (let row=y-3; row<=y; row++) initial.edits.push([col, row, B.AIR]);
    for (let row=y+1; row<=y+4; row++) initial.edits.push([col, row, B.BEDROCK]);
  }
  initial.edits.push([x, y, B.WATERMILL], [x, y+1, B.AIR]);
  initial.water = [[x, y+1, 1000]];
  const stations = new StationStore();
  stations.create('watermill', x, y).input[0] = { item: 'wheat', amount: 1 };
  initial.stations = stations.save();
  const run = (game: Expedition) => {
    for (let i=0; i<90; i++) game.step(1/60, {
      direction: 0, sprint: false, jump: false, mine: false, place: false, aim: { x: x*TILE, y: y*TILE },
    });
    return game.save().stations!.records[0];
  };
  const still = new Expedition(initial.seed, initial);
  assert.equal(run(still).process?.elapsedWork, 0);
  const opened = still.save();
  opened.edits.push([x, y+2, B.AIR]);
  const flowing = new Expedition(opened.seed, decodeSave(JSON.stringify(opened), 1));
  assert.deepEqual(run(flowing).output[0], { item: 'flour', amount: 1 });
});
