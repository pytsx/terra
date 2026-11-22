import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../src/business/world/World';
import { B, TILE } from '../src/business/catalog';
import type { EngineEntity } from '../src/business/entities/EntityRegistry';
import { RNG } from '../src/shared/math';
import { defaultContent } from '../src/assets/runtime';

const entities = defaultContent.entities;

function habitat() {
  const world = new World('habitat');
  const x = world.spawnX, floor = world.heightAt(x);
  for (let dx = -12; dx <= 12; dx++) for (let dy = -3; dy <= 4; dy++) {
    world.set(x + dx, floor + dy, dy < 0 ? B.AIR : dy === 0 ? B.GRASS : B.DIRT, false);
  }
  function spawn(id: string, offset = 0) {
    return entities.create(id, (x + offset) * TILE,
      floor * TILE - entities.asset(id).config.height, 1)!;
  }
  function run(seconds: number, ...population: EngineEntity[]) {
    simulate(0, seconds, population);
  }
  function simulate(start: number, seconds: number, population: EngineEntity[]) {
    const rng = new RNG(1);
    for (let frame = 0; frame < seconds * 60; frame++) {
      for (const animal of population) animal.step(1 / 60, world, animal.view(), rng, population, start + frame / 60);
    }
  }
  return { world, x, floor, spawn, run, simulate };
}

test('a toupeira abre uma galeria contínua e respeita pedra e construções', () => {
  const { world, x, floor, spawn, run } = habitat();
  world.set(x + 4, floor + 1, B.STONE, false);
  world.set(x - 1, floor + 1, B.DIRT);
  run(19, spawn('mole'));
  for (let dx = 0; dx < 4; dx++) assert.equal(world.get(x + dx, floor + 1), B.AIR);
  assert.equal(world.get(x + 4, floor + 1), B.STONE);
  assert.equal(world.get(x - 1, floor + 1), B.DIRT);
  const restored = new World(world.seed);
  restored.importEdits(world.exportEdits());
  assert.equal(restored.get(x + 2, floor + 1), B.AIR);
});

test('a minhoca recupera a pastagem consumida mesmo após recarregar o terreno', () => {
  const { world, x, floor, spawn, run } = habitat();
  run(1, spawn('rabbit'));
  assert.equal(world.get(x, floor), B.DIRT);
  const restored = habitat();
  restored.world.importEdits(world.exportEdits());
  restored.world.restoreEcologicalSoil(world.exportEcologicalSoil());
  restored.run(1, restored.spawn('earthworm'));
  assert.equal(restored.world.get(x, floor), B.GRASS);
  restored.world.set(x, floor, B.DIRT);
  restored.run(1, restored.spawn('earthworm'));
  assert.equal(restored.world.get(x, floor), B.DIRT);
});

test('raposa caça o coelho, cupim decompõe tocos e caranguejo escava areia', () => {
  const { world, x, floor, spawn, run } = habitat();
  const rabbit = spawn('rabbit');
  run(4, spawn('fox', 0), rabbit);
  assert.ok(rabbit.dead);
  world.set(x, floor - 1, B.WOOD, false);
  run(1, spawn('termite'));
  assert.equal(world.get(x, floor - 1), B.AIR);
  world.set(x, floor, B.SAND, false);
  run(1, spawn('sandcrab', 0));
  assert.equal(world.get(x, floor), B.AIR);
  assert.ok(entities.spawnPool(B.SAND).some(entry => entry.id === 'sandcrab'));
  assert.ok(!entities.spawnPool(B.GRASS).some(entry => entry.id === 'sandcrab'));
});

test('o coelho foge ao avistar a raposa e o cupim sobe por um tronco natural', () => {
  const { world, x, floor, spawn, run } = habitat();
  const rabbit = spawn('rabbit'), fox = spawn('fox', -3);
  run(1, rabbit, fox);
  assert.ok(!rabbit.dead && rabbit.view().x > (x + 1) * TILE);
  for (let dy = 1; dy <= 6; dy++) world.set(x, floor - dy, B.WOOD, false);
  const termite = spawn('termite');
  run(3, termite);
  assert.ok(termite.view().y < (floor - 2) * TILE);
});

test('o caranguejo se abriga de dia e deixa a toca à noite', () => {
  const { world, x, floor, spawn, simulate } = habitat();
  world.set(x, floor, B.SAND, false);
  const crab = spawn('sandcrab');
  simulate(0, 8, [crab]);
  assert.ok(crab.view().y >= floor * TILE);
  simulate(120, 12, [crab]);
  assert.ok(Math.abs(crab.view().x - x * TILE) > TILE);
});
