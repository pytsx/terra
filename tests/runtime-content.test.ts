import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultContent } from '../src/assets/runtime';
import { production } from '../src/assets/production';
import { compileRuntimeContent } from '../src/business/content/compileRuntimeContent';
import { Expedition } from '../src/business/Expedition';
import { B, TILE } from '../src/business/catalog';
import { decodeSave } from '../src/store/codec';
import { World } from '../src/business/world/World';
import { SimulationRegion } from '../src/business/simulation/SimulationRegion';
import { blockPartitionAt } from '../src/business/simulation/BlockPartitionScheduler';
import { readFileSync } from 'node:fs';

test('os sistemas migrados não importam arquivos de pacotes nem definições concretas', () => {
  for (const path of ['Expedition', 'world/World', 'worldgen/TerrainColumn', 'inventory/Inventory',
    'stations/ProcessingSystem', 'stations/StationStore', 'entities/RegionalEntityStore']) {
    const source = readFileSync(new URL('../src/business/' + path + '.ts', import.meta.url), 'utf8');
    const dependencies = Array.from(source.matchAll(/from\s+['"]([^'"]+)['"]/g), match => match[1]);
    assert.deepEqual(dependencies.filter(dep => dep.includes('/assets') && !dep.endsWith('/assets/runtime')), [], path);
  }
});

test('o scheduler usa apenas as transformações do mundo que está avançando', () => {
  const content = compileRuntimeContent({ ...production, transformations: [{
    id:'test.dark', source:'STONE', conditions:{ property:'water.volume', operator:'==', value:0 },
    duration:{ seconds:1, mode:'continuous' }, probability:1, retry:'on-condition-reset',
    action:{type:'transformBlock', to:'SAND', preserve:[]},
  }] }, defaultContent);
  const x = 10, y = 10;
  const region = SimulationRegion.around({x:x*TILE,y:y*TILE,w:1,h:1});
  const worlds = [content, defaultContent].map(c => new World('REGISTROS', 6, c));
  for (const world of worlds) {
    world.set(x,y,B.STONE,false);
    world.evolution.step(2, world, region, blockPartitionAt(x,y));
  }
  assert.deepEqual(worlds.map(w => w.get(x,y)), [B.SAND,B.STONE]);
});

test('expedições da mesma seed processam o mesmo insumo com catálogos independentes', () => {
  const recipe = { id: 'test.grind', requires: ['grinding'], inputs: [{ item: 'wheat', amount: 1 }],
    outputs: [{ item: 'sand', amount: 1 }], work: 1 };
  const source = { ...production, processes: [recipe], transformations: [] };
  const alternate = compileRuntimeContent(source, defaultContent);
  recipe.outputs[0].item = 'coal';
  const template = new Expedition('ISOLAMENTO').save();
  const x = 10, y = 12;
  template.player = { ...template.player, x: (x-1)*TILE, y: (y+1)*TILE-30 };
  template.entityRegions = [];
  for (let col=x-2; col<=x+2; col++) {
    template.edits.push([col,y-1,B.AIR], [col,y,B.AIR], [col,y+1,B.STONE]);
  }
  template.edits.push([x,y,B.MILL]);
  template.slots[0] = { item:'wheat', amount:1 };
  const worlds = [defaultContent, alternate].map(content =>
    new Expedition({seed:template.seed, content}, structuredClone(template)));
  const aim = { x:(x+.5)*TILE, y:(y+.5)*TILE };
  for (const game of worlds) {
    assert.ok(game.openWorkbench(aim));
    game.clickStack({area:'bag',index:0});
    const station = game.stationModel!.id;
    assert.ok(game.stationAction(station,'slot','input',0));
    assert.ok(game.stationAction(station,'start'));
  }
  const step = (game: Expedition) => game.step(1/60, {aim, direction:0, jump:false, sprint:false, mine:false, place:false});
  for (let i=0; i<30; i++) worlds.forEach(step);
  const save = decodeSave(JSON.stringify(worlds[1].save()), 1, alternate);
  assert.equal(save.stations!.records[0].process?.recipeId, recipe.id);
  worlds[1] = new Expedition({ seed:save.seed, content:alternate }, save);
  assert.ok(worlds[1].openWorkbench(aim));
  worlds[1].stationAction(worlds[1].stationModel!.id, 'start');
  for (let i=0; i<215; i++) worlds.forEach(step);
  assert.deepEqual(worlds.map(g => g.stationModel!.output[0]?.item), ['flour','sand']);
});
