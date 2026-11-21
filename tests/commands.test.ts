import test from 'node:test';
import assert from 'node:assert/strict';
import { CommandBus, type Command } from '../src/business/commands';
import { Expedition } from '../src/business/Expedition';
import { rainIntensity } from '../src/business/weather';

test('ciclo natural e terminal iniciam a mesma chuva e a mesma dose de precipitação', () => {
  const initial = new Expedition('CHUVA-COMPARTILHADA');
  const snapshot = initial.save();
  const dt = 1 / 60;
  let time = 0;
  while (time < 10000 && rainIntensity(time + dt, initial.world.h, 0) === 0) time++;
  assert.ok(time < 10000);
  Object.assign(snapshot, { elapsed: time, raining: false, weatherMode: 'natural', weatherUntil: 0 });
  const natural = new Expedition(snapshot.seed, snapshot);
  // The natural command runs just after the first fixed step advances the clock.
  const manual = new Expedition(snapshot.seed, { ...snapshot, elapsed: time + dt });
  const controls = { direction: 0, jump: false, sprint: false, mine: false, place: false, aim: natural.player };
  manual.executeCommand('/weather rain');
  // Both players experience the same exposure and a full precipitation interval.
  for (let i = 0; i < 31; i++) {
    natural.step(dt, controls);
    manual.step(dt, controls);
  }
  assert.equal(natural.save().raining, true);
  assert.equal(natural.save().weatherUntil, manual.save().weatherUntil);
  assert.equal(natural.scene(controls.aim).rain, manual.scene(controls.aim).rain);
  assert.ok(natural.save().weather?.doses.some(dose => dose > 0));
  assert.deepEqual(natural.save().weather?.doses, manual.save().weather?.doses);
});

test('atalhos e terminal produzem a mesma seleção, custo e drop persistido', () => {
  const direct = new Expedition('ATALHOS'), terminal = new Expedition('ATALHOS');
  direct.select(1);
  direct.dropSelected();
  assert.equal(terminal.executeCommand('/select 2').ok, true);
  assert.equal(terminal.executeCommand('/drop').ok, true);
  assert.equal(terminal.executeCommand('/select 0').ok, false);
  assert.deepEqual(terminal.save(), direct.save());
});

test('command bus interpreta, despacha e informa comandos inválidos sem alterar o contexto', () => {
  const context = { value: 0 };
  const bus = new CommandBus(context).register('add', {
    usage: '/add <valor>',
    description: 'Soma um valor.',
    create(args, source): Command<typeof context> {
      const amount = Number(args[0]);
      if (args.length !== 1 || !Number.isFinite(amount)) throw new Error('Uso: /add <valor>');
      return {
        name: 'add', source,
        execute(target) {
          target.value += amount;
          return { ok: true, message: `Valor: ${target.value}` };
        },
      };
    },
  });
  assert.deepEqual(bus.executeLine('/add 4'), { ok: true, message: 'Valor: 4' });
  assert.equal(context.value, 4);
  assert.equal(bus.executeLine('/desconhecido').ok, false);
  assert.equal(bus.executeLine('add 9').ok, false);
  assert.match(bus.executeLine('/help').message, /\/add <valor>/);
  assert.equal(context.value, 4);
});

test('weather command controla o mundo e persiste sem criar um caminho especial na interface', () => {
  const game = new Expedition('COMMAND-WEATHER');
  const aim = { x: game.player.x, y: game.player.y };
  const rain = game.executeCommand('/weather rain');
  assert.equal(rain.ok, true);
  assert.equal(game.save().weatherMode, 'rain');
  assert.ok(game.scene(aim).rain > 0);

  const sun = game.executeCommand('/weather sun');
  assert.equal(sun.ok, true);
  assert.equal(game.scene(aim).rain, 0);
  const restored = new Expedition('COMMAND-WEATHER', game.save());
  assert.equal(restored.save().weatherMode, 'sun');
  assert.equal(restored.scene(aim).rain, 0);

  assert.equal(restored.executeCommand('/weather storm').ok, false);
  assert.equal(restored.executeCommand('/weather natural').ok, true);
  assert.equal(restored.save().weatherMode, 'natural');
});

test('modo de colocação alterna pelo comando e permanece no save', () => {
  const game = new Expedition('MODO-DE-COLOCACAO');
  assert.equal(game.placement, 'approach');
  assert.match(game.executeCommand('/placement aproximacao').message, /aproximação/);
  assert.equal(game.placement, 'approach');
  assert.equal(game.executeCommand('/placement livre').ok, true);
  assert.equal(game.placement, 'free');
  assert.equal(game.togglePlacementMode().ok, true);
  assert.equal(game.placement, 'approach');
  const restored = new Expedition(game.world.seed, game.save());
  assert.equal(restored.placement, 'approach');
  assert.equal(restored.executeCommand('/placement distante').ok, false);
});
