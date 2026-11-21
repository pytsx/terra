import test from 'node:test';
import assert from 'node:assert/strict';
import { Expedition, type Controls } from '../src/business/Expedition';
import { B, TILE } from '../src/business/catalog';

test('colocar bloco usa a posição exata da mira ao apontar para baixo', () => {
  const initial = new Expedition('MIRA-EXATA');
  const save = initial.save();
  const tx = Math.floor(save.player.x / TILE);
  const supportY = Math.floor((save.player.y + 30) / TILE) + 2;
  const targetY = supportY + 1;
  save.slots = save.slots.map(() => null);
  save.slots[0] = { item: 'dirt', amount: 2 };
  save.edits.push([tx, supportY, B.STONE], [tx, targetY, B.AIR]);
  const game = new Expedition(save.seed, save);
  const aim = { x: (tx + 0.5) * TILE, y: (targetY + 0.5) * TILE };
  const controls: Controls = {
    aim, direction: 0, jump: false, sprint: false, mine: false, place: true,
  };

  assert.equal(game.placement, 'approach');
  assert.equal(game.executeCommand('/placement livre').ok, true);
  assert.equal(game.target(aim).ty, targetY);
  assert.equal(game.target(aim).canPlace, true);
  game.step(1 / 60, controls);
  assert.equal(game.world.get(tx, targetY), B.DIRT);
  assert.equal(game.world.get(tx - 1, supportY), B.AIR);
  assert.equal(game.world.get(tx + 1, supportY), B.AIR);
});
