import test from 'node:test';
import assert from 'node:assert/strict';
import { B, CHUNK_WIDTH, CHUNK_HEIGHT } from '../src/business/catalog';
import { World } from '../src/business/world/World';
import { createGenerationContext, modernPipeline } from '../src/business/worldgen';
import { mixHash } from '../src/shared/math';

test('cada seção v3 preserva os blocos da coluna original em qualquer ordem de visita', () => {
  // Assinaturas registradas antes da divisão vertical do gerador v3.
  const fixtures = [
    ['AURORA-1264', -8, 2047660597], ['AURORA-1264', 3, 22449328],
    ['INFINITO-42', 0, 1770118833], ['INFINITO-42', 12, 4152312512],
  ] as const;
  for (const [seed, cx, checksum] of fixtures) {
    const world = new World(seed, 3);
    const width = CHUNK_WIDTH, height = world.height, originX = cx * width;
    const original = new Uint16Array(width * height);
    modernPipeline.run(createGenerationContext({
      generationVersion: 3, seed: world.h, width, height, originX, globalX: (x) => originX + x,
      spawnX: world.spawnX - originX, surface: new Int16Array(width),
      get: (x, y) => y < 0 ? B.AIR : (x < 0 || x >= width || y >= height) ? B.BEDROCK : original[y * width + x],
      set: (x, y, id) => { if (x >= 0 && x < width && y >= 0 && y < height) original[y * width + x] = id; },
    }, mixHash(world.h, cx, 0x4c11)));
    assert.equal(original.reduce((hash, id) => Math.imul(hash ^ id, 16777619), 2166136261) >>> 0, checksum);
    const sy = world.heightAt(originX);
    assert.equal(world.peek(originX, sy), undefined, 'metadados de superfície não materializam seções');
    assert.equal(world.get(originX, sy), original[sy * width]);
    assert.equal(world.peek(originX, height - 1), undefined, 'seção profunda continua preguiçosa');
    for (let cy = height / CHUNK_HEIGHT - 1; cy >= 0; cy--)
      for (let y = cy * CHUNK_HEIGHT; y < (cy + 1) * CHUNK_HEIGHT; y++)
        for (let x = 0; x < width; x++)
          assert.equal(world.get(originX + x, y), original[y * width + x], `${seed} · ${originX + x},${y}`);
  }
});

function checksum(world: World) {
  let value = 2166136261;
  for (let y = 0; y < world.height; y++) for (let x = 0; x < world.width; x++)
    value = Math.imul(value ^ world.get(x, y), 16777619);
  return value >>> 0;
}

test('serras, bosques e pradarias têm materiais, cobertura e relevo distintos', () => {
  const world = new World('SERRAS-E-BOSQUES');
  const seen = new Set<string>();
  let forest = 0, forestTrunks = 0, prairie = 0, prairieTrunks = 0;
  const heights: number[] = [];
  for (let x = -1080; x < 1080; x++) {
    const biome = world.biomeAt(x), y = world.heightAt(x);
    seen.add(biome);
    heights.push(y);
    if (biome === 'Serra rochosa') assert.ok([B.STONE, B.GRAVEL].includes(world.get(x, y)));
    const trunk = Number(world.get(x, y - 1) === B.WOOD);
    if (biome === 'Floresta temperada') { forest++; forestTrunks += trunk; }
    if (biome === 'Pradaria') { prairie++; prairieTrunks += trunk; }
  }
  assert.ok(seen.size === 5 && forest > 50 && prairie > 50);
  assert.ok(forestTrunks / forest > prairieTrunks / prairie + 0.06);
  assert.ok(Math.max(...heights) - Math.min(...heights) >= 40);
});

test('o pipeline moderno é explícito, especializado e executado em ordem', () => {
  assert.deepEqual(modernPipeline.stages.map((stage) => stage.name), [
    'multi-noise-climate-splines', 'three-dimensional-density',
    'surface-to-depth-gravel-drainage', 'cheese-spaghetti-noodle-caves',
    'local-aquifers', 'depth-aware-ore-veins',
    'floating-islands', 'climate-surface-features', 'safe-spawn',
  ]);
});

test('veias de gravel ligam o subsolo raso às profundezas e às vezes afloram', () => {
  const world = new World('GRAVEL-DRAINAGE');
  let gravel = 0, exposed = 0, deep = 0, directSoilRock = 0, drainageColumns = 0;
  for (let x = -512; x < 512; x++) {
    const surface = world.heightAt(x);
    let shallowest = Infinity, deepest = -Infinity;
    for (let y = surface; y < world.height - 4; y++) {
      const block = world.get(x, y);
      if (block === B.GRAVEL) {
        const depth = y - surface;
        gravel++;
        shallowest = Math.min(shallowest, depth);
        deepest = Math.max(deepest, depth);
        if (depth === 0) exposed++;
        if (depth >= 40) deep++;
      }
      if (y > surface && world.get(x, y - 1) === B.DIRT && block === B.STONE) directSoilRock++;
    }
    if (shallowest <= 6 && deepest >= 40) drainageColumns++;
  }
  assert.ok(gravel > 2_000 && exposed > 0 && deep > 1_000);
  assert.ok(drainageColumns > 20 && directSoilRock > 100);
  const previousGeneration = new World('GRAVEL-DRAINAGE', 4);
  assert.equal(previousGeneration.get(0, previousGeneration.heightAt(0) + 10) === B.GRAVEL, false);
});

test('a mesma seed gera o mesmo mundo moderno e outra seed muda o resultado', () => {
  const first = new World('PIPELINE-42'), second = new World('PIPELINE-42');
  assert.equal(checksum(first), checksum(second));
  assert.notEqual(checksum(first), checksum(new World('PIPELINE-43')));
});

test('o mundo moderno é profundo, mantém uma crosta grossa e contém ilhas e aquíferos', () => {
  const world = new World('AURORA-1264');
  let shallowVoid = 0, caveVoid = 0, islandBlocks = 0, water = 0, lava = 0;
  for (let x = 0; x < world.width; x++) {
    const surface = world.heightAt(x);
    for (let y = 0; y < world.height; y++) {
      const block = world.get(x, y);
      if (y >= surface && y < surface + 26 && block === B.AIR) shallowVoid++;
      if (y >= surface + 26 && block === B.AIR) caveVoid++;
      if (y < surface - 8 && block !== B.AIR) islandBlocks++;
      if (block === B.WATER) water++;
      if (block === B.LAVA) lava++;
    }
  }
  assert.equal(world.height, 256);
  assert.equal(shallowVoid, 0);
  assert.ok(caveVoid > 1_000);
  assert.ok(islandBlocks > 10);
  assert.ok(water > 100 && lava > 10);
});

test('o gerador legado conserva altura e matriz para saves antigos', () => {
  const world = new World('AURORA-1264', 1);
  assert.equal(world.height, 158);
  assert.equal(checksum(world), 4254747726);
});

test('chunks são gerados sob demanda nos dois sentidos e alterações globais sobrevivem ao descarte', () => {
  const world = new World('INFINITO-42');
  const x = -4_123, y = world.heightAt(x) + 3;
  world.set(x, y, B.WORKBENCH);
  for (let chunk = 0; chunk < 80; chunk++) world.get(chunk * 64, 100);
  assert.ok(world.loadedChunks <= 64);
  assert.equal(world.get(x, y), B.WORKBENCH);
  const restored = new World('INFINITO-42');
  restored.importEdits(world.exportEdits());
  assert.equal(restored.get(x, y), B.WORKBENCH);
});

test('depósitos são raros e a matriz subterrânea continua dominada por terra e rocha', () => {
  const world = new World('GEOLOGIA-7');
  let rock = 0, ores = 0;
  for (let x = -256; x < 256; x++) for (let y = world.heightAt(x); y < world.height - 4; y++) {
    const block = world.get(x, y);
    if (block === B.DIRT || block === B.SAND || block === B.STONE || block === B.DEEP) rock++;
    if (block === B.COAL || block === B.COPPER || block === B.IRON || block === B.GOLD || block === B.CRYSTAL) ores++;
  }
  assert.ok(rock > ores * 80);
});

test('consultar o mapa não gera chunks e seus limites refletem somente a região carregada', () => {
  const world = new World('MAPA-INCREMENTAL');
  const before = world.loadedChunks;
  assert.equal(world.mapPeek(90_000, 100), undefined);
  assert.equal(world.loadedChunks, before);
  world.exploreAround(-130, 100);
  const bounds = world.exploredBounds();
  assert.ok(bounds.left <= -130 && bounds.right >= -130);
  assert.equal(world.mapPeek(-130, 100) !== undefined, true);
  assert.equal(world.mapPeek(-130, 220), undefined);
  world.exploreAround(-130, 220);
  assert.equal(world.mapPeek(-130, 220) !== undefined, true);
});

test('o histórico do minimapa sobrevive ao save sem gerar chunks ao ser restaurado', () => {
  const world = new World('HISTORICO-MAPA');
  world.exploreAround(-420, 150);
  const expected = world.mapPeek(-420, 150);
  const restored = new World('HISTORICO-MAPA');
  restored.importExploration(world.exportExploration());
  assert.equal(restored.loadedChunks, 0);
  assert.equal(restored.mapPeek(-420, 150), expected);
  assert.equal(restored.mapPeek(2_000, 150), undefined);
});

test('cadeias montanhosas têm grande amplitude e minérios comuns dominam perto da superfície', () => {
  const world = new World('MONTANHAS-E-GEOLOGIA');
  let minSurface = Infinity, maxSurface = -Infinity, common = 0, rare = 0;
  for (let x = -700; x < 700; x++) {
    const surface = world.heightAt(x);
    minSurface = Math.min(minSurface, surface);
    maxSurface = Math.max(maxSurface, surface);
    for (let y = surface + 8; y < Math.min(world.height - 4, surface + 120); y++) {
      const block = world.get(x, y);
      if (block === B.COAL || block === B.COPPER || block === B.IRON) common++;
      if (block === B.GOLD || block === B.CRYSTAL) rare++;
    }
  }
  assert.ok(maxSurface - minSurface >= 25);
  assert.ok(common > rare * 4);
});
