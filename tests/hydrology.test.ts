import test from 'node:test';
import assert from 'node:assert/strict';
import { B, BLOCKS, CHUNK_WIDTH, TILE } from '../src/business/catalog';
import { World } from '../src/business/world/World';
import { EntityRegistry } from '../src/business/entities/EntityRegistry';
import { Expedition } from '../src/business/Expedition';
import { decodeSave } from '../src/store/codec';
import { RNG } from '../src/shared/math';
import { Explorer } from '../src/business/entities/Explorer';
import { HYDROLOGY_RADIUS_CHUNKS, MAX_FLOW_CELLS_PER_TICK } from '../src/business/world/Hydrology';
import { SimulationRegion } from '../src/business/simulation/SimulationRegion';

function basin(block: number) {
  const w = new World('BACIA');
  for (let y = 0; y <= 11; y++) {
    w.set(0, y, B.BEDROCK, false);
    w.set(2, y, B.BEDROCK, false);
    w.set(1, y, y === 11 ? B.BEDROCK : y === 10 ? block : B.AIR, false);
  }
  return w;
}

test('areia infiltra mais que terra e pedra; o volume inicial se conserva', () => {
  const absorbed = [B.SAND, B.DIRT, B.STONE].map(id => {
    const world = basin(id);
    world.hydrology.restore([[1, 9, 900]]);
    world.hydrology.step(0.5, world, 1, 9, 0, 0);
    const soil = world.waterAt(1, 10);
    assert.ok(Math.abs(world.waterAt(1, 9) + soil - 0.9) < 0.00001);
    return soil;
  });
  assert.ok(absorbed[0] > absorbed[1] && absorbed[1] > absorbed[2]);
});

test('permeabilidade segue a dureza e folhas retêm quase nenhuma chuva', () => {
  const leaf = BLOCKS[B.LEAF], sand = BLOCKS[B.SAND], dirt = BLOCKS[B.DIRT], stone = BLOCKS[B.STONE];
  assert.ok(leaf.permeability! > sand.permeability!);
  assert.ok(sand.permeability! > dirt.permeability!);
  assert.ok(dirt.permeability! > stone.permeability!);
  assert.ok(leaf.waterCapacity! <= 0.08);
  const porous = [B.DIRT, B.GRASS, B.SAND, B.LEAF].map(id => BLOCKS[id].permeability!);
  const rock = [B.STONE, B.DEEP, B.COAL, B.COPPER, B.IRON, B.GOLD, B.CRYSTAL]
    .map(id => BLOCKS[id].permeability!);
  assert.ok(Math.max(...rock) <= Math.min(...porous) / 100);
  assert.ok(Math.min(...rock) > 0);
});

test('pedra compacta leva dias para absorver água em contato direto', () => {
  const world = basin(B.STONE);
  world.hydrology.restore([[1, 9, 900]]);
  const initial = world.waterAt(1, 9);
  for (let tick = 0; tick < 120; tick++) world.hydrology.step(0.5, world, 1, 9, 0, 0);
  const absorbed = world.waterAt(1, 10);
  assert.ok(absorbed > 0, 'pedra deve absorver um traço mínimo');
  assert.ok(absorbed < 0.01, `pedra absorveu água demais: ${absorbed}`);
  assert.ok(world.waterAt(1, 9) > initial - 0.01);
});

test('pedras adjacentes não bypassam a permeabilidade ao propagar excedente', () => {
  const world = new World('PEDRA-ADJACENTE');
  for (let y = 0; y <= 12; y++) {
    world.set(0, y, B.BEDROCK, false);
    world.set(1, y, y === 12 ? B.BEDROCK : y >= 10 ? B.STONE : B.AIR, false);
    world.set(2, y, B.BEDROCK, false);
  }
  world.hydrology.restore([[1, 9, 900]]);
  for (let tick = 0; tick < 240; tick++) world.hydrology.step(0.5, world, 1, 9, 0, 0);
  assert.ok(world.waterAt(1, 11) < 0.01, `a segunda pedra recebeu água demais: ${world.waterAt(1, 11)}`);
});

test('gravel concentra água vizinha, drena para baixo e armazena dois blocos de volume', () => {
  const gravel = BLOCKS[B.GRAVEL];
  assert.equal(gravel.waterCapacity, 2);
  assert.ok(gravel.permeability! > BLOCKS[B.SAND].permeability! * 3);
  const w = new World('GRAVEL-HIDRAULICO');
  for (let x = 3; x <= 7; x++) for (let y = 9; y <= 12; y++)
    w.set(x, y, y === 12 ? B.BEDROCK : B.STONE, false);
  w.set(4, 10, B.DIRT, false);
  w.set(5, 10, B.GRAVEL, false);
  w.set(5, 11, B.GRAVEL, false);
  w.hydrology.restore([[4, 10, 500]]);
  w.hydrology.step(0.5, w, 5, 10, 0, 0);
  assert.equal(w.waterAt(4, 10), 0.05);
  assert.equal(w.waterAt(5, 10), 0.45);
  w.hydrology.step(0.5, w, 5, 10, 0, 0);
  assert.ok(w.waterAt(5, 11) > w.waterAt(5, 10));

  const save = new Expedition('GRAVEL-SAVE').save();
  save.water = [[5, 10, 1800]];
  assert.deepEqual(decodeSave(JSON.stringify(save), 1).water, save.water);
});

test('uma depressão de pedra acumula chuva antes de uma depressão de terra', () => {
  const stone = basin(B.STONE), dirt = basin(B.DIRT);
  stone.hydrology.step(10, stone, 1, 9, 1, 0);
  dirt.hydrology.step(10, dirt, 1, 9, 1, 0);
  assert.ok(stone.waterAt(1, 9) > 0.05);
  assert.equal(dirt.waterAt(1, 9), 0);
});

test('a chuva satura o solo, forma uma poça e só evapora com sol direto', () => {
  const world = basin(B.DIRT);
  world.hydrology.step(12, world, 1, 9, 1, 0);
  assert.ok(world.waterAt(1, 10) <= 0.13 && world.waterAt(1, 9) === 0);
  world.hydrology.step(148, world, 1, 9, 1, 0);
  assert.equal(world.waterAt(1, 10), 0.55);
  const total = () => Array.from({length: 10}, (_, y) => world.waterAt(1, y)).reduce((a, b) => a + b);
  const pooled = total();
  assert.ok(pooled > 1);
  world.set(1, 4, B.BEDROCK);
  world.hydrology.step(4, world, 1, 9, 0, 1);
  assert.equal(total(), pooled);
  world.set(1, 4, B.AIR);
  world.hydrology.step(4, world, 1, 9, 0, 0);
  assert.equal(total(), pooled);
  world.hydrology.step(4, world, 1, 9, 0, 1);
  assert.ok(total() < pooled);
});

test('blocos sólidos só propagam depois da saturação e dão prioridade ao vazio abaixo', () => {
  const w = new World('SATURACAO-POROSIDADE');
  for (let x = 3; x <= 7; x++) w.set(x, 10, B.DIRT, false);
  w.set(5, 11, B.AIR, false);
  w.hydrology.restore([[5, 10, 550]]);
  w.hydrology.step(0.5, w, 5, 10, 0, 0);
  assert.equal(w.waterAt(5, 10), 0.55);
  assert.equal(w.waterAt(4, 10), 0);
  assert.equal(w.waterAt(6, 10), 0);

  w.hydrology.restore([[5, 10, 900]]);
  w.hydrology.step(1, w, 5, 10, 0, 0);
  assert.equal(w.waterAt(5, 10), 0.55);
  assert.ok(w.waterAt(5, 11) + w.waterAt(5, 12) >= w.waterAt(4, 10));
  assert.ok(w.waterAt(5, 11) + w.waterAt(5, 12) >= w.waterAt(6, 10));
});

test('o excedente satura vizinhos imediatos antes de alcançar a próxima camada', () => {
  const w = new World('FRENTE-DE-SATURACAO');
  for (let y = 8; y <= 12; y++) for (let x = 2; x <= 8; x++)
    w.set(x, y, x === 2 || x === 8 || y === 8 || y === 12 ? B.BEDROCK : B.DIRT, false);
  w.set(5, 10, B.DIRT, false);
  w.set(5, 11, B.BEDROCK, false);
  w.hydrology.restore([[5, 10, 1850]]);
  w.hydrology.step(0.5, w, 5, 10, 0, 0);
  assert.equal(w.waterAt(5, 10), 0.55);
  assert.equal(w.waterAt(4, 10), 0.55);
  assert.equal(w.waterAt(6, 10), 0.55);
  assert.equal(w.waterAt(3, 10), 0);
  assert.equal(w.waterAt(7, 10), 0);
});

test('água corrente infiltra mais devagar que água parada', () => {
  const prepare = (seed: string, x: number, falling: boolean) => {
    const w = new World(seed);
    w.set(x, 5, B.AIR, false);
    w.set(x + 1, 5, B.DIRT, false);
    w.set(x, 6, falling ? B.AIR : B.BEDROCK, false);
    w.set(x + 1, 6, B.BEDROCK, false);
    const cells: [number, number, number][] = [[x, 5, 500]];
    if (falling) cells.push([x, 6, 950]);
    w.hydrology.restore(cells);
    w.hydrology.step(0.5, w, x, 5, 0, 0);
    return w.waterAt(x + 1, 5);
  };
  const moving = prepare('AGUA-CORRENTE', 4, true);
  const still = prepare('AGUA-PARADA', 4, false);
  assert.ok(still > 0 && still >= moving * 4);
});

test('água cai, espalha sobre um piso e volta com o mesmo volume ao carregar', () => {
  const w = new World('FLUXO');
  for (let x = -5; x <= 5; x++) w.set(x, 10, B.BEDROCK);
  w.hydrology.restore([[0, 8, 980]]);
  w.hydrology.step(1, w, 0, 10, 0, 0);
  assert.ok(w.waterAt(0, 8) === 0 && w.waterAt(-1, 9) + w.waterAt(1, 9) > 0);
  const save = new Expedition(w.seed).save();
  save.edits = w.exportEdits();
  save.water = w.hydrology.save();
  const loaded = new Expedition(w.seed, decodeSave(JSON.stringify(save), 1));
  assert.deepEqual(loaded.save().water, save.water);
  assert.equal(save.water.reduce((v, cell) => v + cell[2], 0), 980);
});

test('uma raposa consome água disponível e pode morrer de fome mesmo hidratada', () => {
  const world = basin(B.STONE), rng = new RNG(42);
  const fox = EntityRegistry.create('fox', TILE, 10 * TILE - 17, 0)!;
  world.set(1, 9, B.WATER, false);
  for (let frame = 0; frame < 280 * 30 && !fox.dead; frame++)
    fox.step(1 / 30, world, fox.view(), rng, [fox], 0);
  assert.ok(world.waterAt(1, 9) < 1);
  assert.ok(Number(fox.view().hydration) > 0.4);
  assert.equal(fox.view().nutrition, 0);
  assert.ok(fox.dead);
});

test('caçar repõe nutrição mas não impede a morte por desidratação', () => {
  const world = basin(B.STONE), rng = new RNG(7);
  const fox = EntityRegistry.create('fox', TILE, 10 * TILE - 17, 0)!;
  const simulate = (seconds: number, prey?: typeof fox) => {
    const residents = prey ? [fox, prey] : [fox];
    for (let frame = 0; frame < seconds * 30 && !fox.dead; frame++)
      fox.step(1 / 30, world, fox.view(), rng, residents, 0);
  };
  simulate(100);
  const before = Number(fox.view().nutrition);
  const rabbit = EntityRegistry.create('rabbit', fox.view().x, fox.view().y, 1)!;
  simulate(2, rabbit);
  assert.ok(rabbit.dead && Number(fox.view().nutrition) > before);
  simulate(95);
  assert.ok(fox.dead && Number(fox.view().nutrition) > 0);
  assert.equal(fox.view().hydration, 0);
});

test('a chuva alcança chunks distantes, continua no subsolo e deixa umidade em chunks recém-ativados', () => {
  const w = new World('CHUVA-REGIONAL');
  const prepare = (x: number) => {
    for (let dx = -1; dx <= 1; dx++) {
      w.set(x + dx, 9, B.AIR, false);
      w.set(x + dx, 10, B.DIRT, false);
    }
  };
  prepare(12); prepare(590);
  w.hydrology.step(5, w, 12, 190, 1, 0);
  assert.ok(w.waterAt(12, 10) > 0 && w.waterAt(590, 10) > 0);
  prepare(-350);
  w.hydrology.step(0.5, w, 12, 190, 1, 0);
  const distantMoisture = [-1, 0, 1].reduce((sum, dx) =>
    sum + w.waterAt(-350 + dx, 10), 0);
  assert.ok(distantMoisture > 0.005);
});

test('camadas saturadas recarregam um aquífero gerado sem criar seções novas', () => {
  const w = new World('RECARGA-AQUIFERO');
  const saturated: [number, number, number][] = [];
  for (const x of [20, 22]) {
    for (let y = 0; y < 5; y++) w.set(x, y, B.AIR, false);
    w.set(x, 5, B.DIRT, false);
    for (let y = 6; y < 50; y++) w.set(x, y, B.STONE, false);
    w.set(x, 50, B.WATER, false);
    w.set(x, 51, B.BEDROCK, false);
    for (let y = 5; y <= 51; y++) {
      w.set(x - 1, y, B.BEDROCK, false);
      w.set(x + 1, y, B.BEDROCK, false);
    }
  }
  saturated.push([20, 5, 550]);
  for (let y = 6; y <= 38; y++) saturated.push([20, y, 80]);
  saturated.push([20, 50, 400], [22, 50, 400]);
  w.hydrology.restore(saturated);
  const chunks = w.loadedChunks;
  w.hydrology.step(0.5, w, 20, 8, 1, 0);
  assert.ok(w.waterAt(20, 50) > 0.4);
  assert.equal(w.waterAt(22, 50), 0.4);
  assert.ok(w.hydrology.aquiferRechargeLastTick > 0);
  assert.equal(w.loadedChunks, chunks);
});

test('água percorre toda a altura do chunk ativo até uma cavidade profunda', () => {
  const w = new World('COLUNA-HIDROLOGICA'), x = 18;
  for (let y = 4; y <= 90; y++) {
    w.set(x, y, y === 90 ? B.BEDROCK : B.AIR, false);
    w.set(x - 1, y, B.BEDROCK, false);
    w.set(x + 1, y, B.BEDROCK, false);
  }
  w.hydrology.restore([[x, 4, 1000]]);
  const region = SimulationRegion.around({ x: x * TILE, y: 4 * TILE, w: TILE, h: TILE });
  for (let i = 0; i < 100; i++) w.hydrology.step(0.5, w, x, 4, 0, 0, undefined, region);
  assert.equal(w.waterAt(x, 4), 0);
  assert.equal(w.waterAt(x, 89), 1);
});

test('capilaridade só se propaga após saturar e conserva o volume', () => {
  const w = new World('CAPILAR');
  for (let x = 9; x <= 13; x++) {
    w.set(x, 8, B.BEDROCK, false); w.set(x, 10, B.BEDROCK, false);
    w.set(x, 9, x === 9 || x === 13 ? B.BEDROCK : B.DIRT, false);
  }
  w.hydrology.restore([[11, 9, 330]]);
  w.hydrology.step(25, w, 10, 9, 0, 0);
  const levels = [10, 11, 12].map(x => Math.round(w.waterAt(x, 9) * 1000));
  assert.equal(levels.reduce((a, b) => a + b), 330);
  assert.deepEqual(levels, [0, 330, 0]);
});

test('distribuição hidráulica tem raio e custo máximo fixos por atualização', () => {
  const w = new World('ORCAMENTO-HIDRICO');
  const cells: [number, number, number][] = [];
  for (let chunk = -HYDROLOGY_RADIUS_CHUNKS; chunk <= HYDROLOGY_RADIUS_CHUNKS; chunk++) {
    w.get(chunk * CHUNK_WIDTH, 8);
    for (let x = chunk * CHUNK_WIDTH; x < (chunk + 1) * CHUNK_WIDTH; x++)
      for (let y = 8; y < 14; y++) cells.push([x, y, 500]);
  }
  const distantX = (HYDROLOGY_RADIUS_CHUNKS + 3) * CHUNK_WIDTH;
  w.get(distantX, 8);
  cells.push([distantX, 8, 500]);
  w.hydrology.restore(cells);
  w.hydrology.step(0.5, w, 0, 10, 0, 0);
  assert.equal(w.hydrology.processedLastTick, MAX_FLOW_CELLS_PER_TICK);
  assert.equal(w.waterAt(distantX, 8), 0.5);
  assert.equal(w.waterAt(distantX, 9), 0);
  w.hydrology.step(0.5, w, distantX, 10, 0, 0);
  assert.ok(w.waterAt(distantX, 8) < 0.5 || w.waterAt(distantX, 9) > 0);
});

test('a erosão por chuva abre uma bacia sob um teto intacto e preserva a água ao recarregar', () => {
  const w = new World('LENÇOL'), x = 40, y = w.heightAt(x) + 4;
  for (let row = 0; row <= y; row++) {
    w.set(x + 1, row, B.AIR, false);
    w.set(x + 2, row, B.BEDROCK, false);
  }
  w.set(x, y - 1, B.BEDROCK, false);
  w.set(x - 1, y, B.BEDROCK, false);
  for (const tx of [x, x + 1]) {
    w.set(tx, y, B.DIRT, false); w.set(tx, y + 1, B.BEDROCK, false);
  }
  w.hydrology.step(75, w, x, y, 1, 0);
  assert.equal(w.get(x, y), B.DIRT);
  w.hydrology.step(160, w, x, y, 1, 0);
  assert.equal(w.get(x, y - 1), B.BEDROCK);
  assert.equal(w.get(x, y), B.AIR);
  assert.ok(w.waterAt(x, y) > 0.25);
  const restored = new World(w.seed);
  restored.importEdits(w.exportEdits()); restored.hydrology.restore(w.hydrology.save());
  assert.equal(restored.get(x, y), B.AIR);
  assert.equal(restored.waterAt(x, y), w.waterAt(x, y));
});

test('o explorador e um animal submersos sobem e flutuam na superfície parcial', () => {
  const w = new World('FLUTUAR'), rng = new RNG(1);
  const water: [number, number, number][] = [];
  for (let x = -5; x <= 5; x++) for (let y = 8; y <= 16; y++) {
    w.set(x, y, y === 16 ? B.BEDROCK : B.AIR, false);
    if (y >= 10 && y < 16) water.push([x, y, y === 10 ? 500 : 1000]);
  }
  w.hydrology.restore(water);
  const player = new Explorer(w, { x: 0, y: 14 * TILE, life: 5, depthMax: 0, placed: 0 });
  const fox = EntityRegistry.create('fox', TILE, 14 * TILE, 0)!;
  for (let i = 0; i < 300; i++) {
    player.step(1/60, { direction: 0, jump: false, sprint: false }, w);
    fox.step(1/60, w, player.view(), rng);
  }
  for (const actor of [player.view(), fox.view()]) {
    assert.ok(actor.swimming && actor.y < 10.5 * TILE && actor.y + actor.h > 10.5 * TILE);
  }
});

test('folhas retêm pouca água e gotejam até o solo abaixo da copa', () => {
  const w = new World('COPA-PERMEAVEL');
  for (let y = 0; y < 12; y++) w.set(5, y, y === 5 ? B.LEAF : y === 10 ? B.DIRT : B.AIR, false);
  w.hydrology.step(20, w, 5, 8, 1, 0);
  assert.ok(w.waterAt(5, 5) > 0 && w.waterAt(5, 5) <= 0.08);
  assert.ok(Array.from({length: 5}, (_, i) => w.waterAt(5, 6 + i)).reduce((a, b) => a + b, 0) > 0);
});

test('água livre cai como corpo contínuo e o traço estreito fica reservado ao gotejamento', () => {
  const w = new World('QUEDA-LIQUIDA');
  for (let y = 0; y < 12; y++) w.set(4, y, y === 10 ? B.BEDROCK : B.AIR, false);
  w.hydrology.restore([[4, 4, 300]]);
  assert.equal(w.waterFlowingAt(4, 4), true);
  assert.equal(w.waterDrippingAt(4, 4), false);
  w.hydrology.restore([[4, 9, 300]]);
  assert.equal(w.waterFlowingAt(4, 9), false);
  w.set(4, 4, B.LEAF, false);
  w.hydrology.restore([[4, 4, 80]]);
  w.hydrology.step(0.5, w, 4, 6, 0, 0);
  assert.equal(w.waterDrippingAt(4, 5), true);
});

test('blocos vizinhos formam um corpo de água com uma única altura estável', () => {
  const w = new World('CORPO-DAGUA');
  w.set(2, 8, B.BEDROCK, false);
  w.set(9, 8, B.BEDROCK, false);
  w.set(2, 9, B.BEDROCK, false);
  w.set(9, 9, B.BEDROCK, false);
  for (let x = 3; x <= 8; x++) {
    w.set(x, 8, B.AIR, false);
    w.set(x, 9, B.BEDROCK, false);
  }
  w.set(3, 8, B.BEDROCK, false);
  w.set(8, 8, B.BEDROCK, false);
  w.hydrology.restore([[5, 8, 900], [6, 8, 100]]);
  w.hydrology.step(8, w, 5, 8, 0, 0);
  const levels = [4, 5, 6, 7].map(x => Math.round(w.waterAt(x, 8) * 1000));
  assert.equal(levels.reduce((sum, level) => sum + level), 1000);
  assert.ok(Math.max(...levels) - Math.min(...levels) <= 2);
  assert.ok(levels.filter(Boolean).length > 2);
  for (let x = 4; x <= 7; x++) assert.equal(w.waterDrippingAt(x, 8), false);
});

test('um novo volume eleva todo o corpo conectado na mesma atualização', () => {
  const w = new World('NIVEL-ATOMICO');
  for (let x = 3; x <= 7; x++) {
    w.set(x, 8, x === 3 || x === 7 ? B.BEDROCK : B.AIR, false);
    w.set(x, 9, B.BEDROCK, false);
  }
  w.hydrology.restore([[4, 8, 900], [5, 8, 100], [6, 8, 500]]);
  w.hydrology.step(0.5, w, 5, 8, 0, 0);
  let levels = [4, 5, 6].map(x => Math.round(w.waterAt(x, 8) * 1000));
  assert.deepEqual(levels, [500, 500, 500]);

  // A célula central recebe 500 unidades novas. O acréscimo pertence ao corpo
  // inteiro, portanto nenhuma coluna conserva um pico isolado.
  w.set(5, 8, B.WATER);
  w.hydrology.step(0.5, w, 5, 8, 0, 0);
  levels = [4, 5, 6].map(x => Math.round(w.waterAt(x, 8) * 1000));
  assert.equal(levels.reduce((sum, level) => sum + level), 2000);
  assert.ok(Math.max(...levels) - Math.min(...levels) <= 1);
});

test('lava conserva volume e se move mais devagar que água', () => {
  const w = new World('LAVA-FLOW');
  for (let x = -3; x <= 3; x++) w.set(x, 10, B.BEDROCK, false);
  w.hydrology.restore([[0, 8, 900]]);
  w.hydrology.step(0.5, w, 0, 8, 0, 0);
  assert.equal(w.hydrology.save().reduce((sum, cell) => sum + cell[2], 0), 900);
  const water = w.fluidKindAt(0, 8);
  assert.equal(water, undefined);
  w.set(0, 8, B.LAVA, false);
  w.hydrology.restore([[0, 8, 900]]);
  assert.equal(w.fluidKindAt(0, 8), 'lava');
});

test('o jogador mergulha, volta à superfície e mantém impulso para sair do lago', () => {
  const w = new World('MERGULHO');
  const water: [number, number, number][] = [];
  for (let x = -4; x <= 4; x++) for (let y = 7; y <= 15; y++) {
    w.set(x, y, y === 15 ? B.BEDROCK : B.AIR, false);
    if (y >= 8 && y < 15) water.push([x, y, 1000]);
  }
  w.hydrology.restore(water);
  const player = new Explorer(w, { x: 0, y: 8 * TILE, life: 5, depthMax: 0, placed: 0 });
  for (let i = 0; i < 80; i++)
    player.step(1/60, { direction: 0, jump: false, dive: true, sprint: false }, w);
  const submerged = player.view().y;
  assert.ok(submerged > 9 * TILE && player.view().swimming);
  for (let i = 0; i < 100; i++)
    player.step(1/60, { direction: 0, jump: false, ascend: true, sprint: false }, w);
  assert.ok(player.view().y < 8 * TILE - player.view().h && !player.view().swimming);
});
