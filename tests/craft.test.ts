import test from 'node:test';
import assert from 'node:assert/strict';
import { Inventory, startingSlots } from '../src/business/inventory/Inventory';
import { RecipeBook, recipes } from '../src/business/craft/RecipeBook';
import { Expedition } from '../src/business/Expedition';
import { B, BELT_SIZE, TILE, WORLD_W, type Slot, type SlotRef } from '../src/business/catalog';
import { Slime } from '../src/business/entities/Slime';
import { RNG } from '../src/shared/math';
import { World } from '../src/business/world/World';
import { Cow } from '../src/business/entities/Cow';
import { Wolf } from '../src/business/entities/Wolf';
import { modularBlocks, modularEntities, modularItems } from '../src/assets';
import { BLOCKS } from '../src/business/catalog';
const bag = (index: number): SlotRef => ({ area: 'bag', index });
const grid = (index: number): SlotRef => ({ area: 'grid', index });

test('cada bloco fornece sua própria renderização pixelada ao atlas', () => {
  for (const [id, asset] of Object.entries(modularBlocks))
    assert.equal(typeof asset.script.placed.render, 'function', id);
});

test('cada entidade e ferramenta fornece todos os estados visuais que utiliza', () => {
  for (const [id, asset] of Object.entries(modularEntities))
    assert.equal(typeof asset.script.render, 'function', id);
  for (const [id, asset] of Object.entries(modularItems)) {
    if (asset.config.kind !== 'tool') continue;
    assert.equal(typeof asset.script.renderInventory, 'function', id + ' no inventário');
    assert.equal(typeof asset.script.renderDropped, 'function', id + ' no mundo');
    assert.equal(typeof asset.script.renderHeld, 'function', id + ' na mão');
  }
});

test('quatro tábuas em quatro células produzem uma bancada somente ao retirar a saída', () => {
  const pack = new Inventory();
  for (let i = 0; i < 4; i++) assert.ok(pack.move(bag(4), grid(0)));
  assert.equal(pack.snapshot().result, null);
  assert.equal(pack.takeResult(), null);
  for (let i = 1; i <= 3; i++) assert.ok(pack.move(grid(0), grid(i)));
  const before = pack.snapshot();
  assert.deepEqual(before.result, { item: 'workbench', amount: 1 });
  assert.equal(pack.takeResult(bag(4)), null);
  assert.deepEqual(pack.snapshot(), before);
  assert.deepEqual(pack.takeResult(bag(7)), before.result);
  assert.equal(pack.count('plank'), 10);
  assert.equal(pack.takeResult(), null);
  assert.equal(pack.at(7)?.item, 'workbench');
});
test('o livro lista somente receitas disponíveis e o clique pode preencher a grade', () => {
  const slots = Array.from({ length: BELT_SIZE * 4 }, (): Slot => null);
  slots[BELT_SIZE] = { item: 'plank', amount: 4 };
  const inventory = new Inventory(slots);
  const workbench = recipes.recipes.findIndex((recipe) => recipe.output.item === 'workbench');
  const boots = recipes.recipes.findIndex((recipe) => recipe.output.item === 'leatherBoots');
  assert.ok(inventory.craftableRecipes().some((entry) => entry.index === workbench));
  assert.equal(inventory.craftableRecipes().some((entry) => entry.index === boots), false);
  assert.equal(inventory.fillRecipe(workbench), true);
  assert.deepEqual(inventory.snapshot().grid.map((stack) => stack?.item),
    ['plank', 'plank', 'plank', 'plank']);
  assert.equal(inventory.snapshot().result?.item, 'workbench');
});
test('clique carrega a pilha na mão e o arrasto divide incluindo o primeiro slot', () => {
  const slots = Array.from({ length: BELT_SIZE * 4 }, (): Slot => null);
  slots[0] = { item: 'dirt', amount: 64 };
  const inventory = new Inventory(slots);
  assert.equal(inventory.click({ area: 'bag', index: 0 }), true);
  assert.deepEqual(inventory.snapshot().cursor, { item: 'dirt', amount: 64 });
  const targets = [1, 2, 3, 4, 5].map((index) => ({ area: 'bag' as const, index }));
  const preview = inventory.distributionPreview(targets);
  assert.deepEqual([...preview!.values()], [12, 12, 12, 12, 12]);
  assert.ok(targets.every(({ index }) => inventory.snapshot().slots[index] === null));
  assert.equal(inventory.distribute(targets), true);
  assert.deepEqual(targets.map(({ index }) => inventory.snapshot().slots[index]?.amount), [12, 12, 12, 12, 12]);
  assert.deepEqual(inventory.snapshot().cursor, { item: 'dirt', amount: 4 });
});
test('clicar no resultado prioriza barra, depois mochila e por fim o cursor', () => {
  const workbench = recipes.recipes.findIndex((recipe) => recipe.output.item === 'workbench');
  const open = Array.from({ length: BELT_SIZE * 4 }, (): Slot => null);
  open[BELT_SIZE] = { item: 'plank', amount: 4 };
  const withSpace = new Inventory(open);
  assert.equal(withSpace.fillRecipe(workbench), true);
  assert.equal(withSpace.takeResult()?.item, 'workbench');
  assert.equal(withSpace.snapshot().slots[0]?.item, 'workbench');

  const full = Array.from({ length: BELT_SIZE * 4 }, (): Slot => ({ item: 'dirt', amount: 1 }));
  full[BELT_SIZE] = { item: 'plank', amount: 5 };
  const withoutSpace = new Inventory(full);
  assert.equal(withoutSpace.fillRecipe(workbench), true);
  assert.equal(withoutSpace.takeResult()?.item, 'workbench');
  assert.equal(withoutSpace.snapshot().cursor?.item, 'workbench');
  assert.equal(withoutSpace.snapshot().slots[BELT_SIZE]?.item, 'plank');
});
test('prévia distribui múltiplos slots sem alterar o item no cursor', () => {
  const pack = new Inventory(startingSlots({ wood: 13 }));
  const source = { area: 'bag' as const, index: 3 };
  assert.ok(pack.click(source));
  assert.equal(pack.snapshot().cursor?.item, 'wood');
  const before = pack.snapshot();
  const preview = pack.distributionPreview([
    { area: 'bag', index: 8 },
    { area: 'bag', index: 9 },
  ]);
  assert.deepEqual(preview, new Map([
    ['bag-8', 6],
    ['bag-9', 6],
  ]));
  assert.deepEqual(pack.snapshot(), before);
  assert.ok(pack.distribute([
    { area: 'bag', index: 8 },
    { area: 'bag', index: 9 },
  ]));
  assert.equal(pack.at(8)?.amount, 6);
  assert.equal(pack.at(9)?.amount, 6);
  assert.equal(pack.snapshot().cursor?.amount, 1);
});

test('fechar o inventário cancela a seleção na origem ou no primeiro slot vazio', () => {
  const origin = new Inventory([{ item: 'wood', amount: 7 }]);
  assert.ok(origin.click(bag(0)));
  assert.equal(origin.cancelCursorTransaction(), null);
  assert.deepEqual(origin.at(0), { item: 'wood', amount: 7 });
  assert.equal(origin.snapshot().cursor, null);

  const swapped = new Inventory([
    { item: 'wood', amount: 2 },
    { item: 'dirt', amount: 3 },
  ]);
  assert.ok(swapped.click(bag(0)));
  assert.ok(swapped.click(bag(1)));
  assert.equal(swapped.cancelCursorTransaction(), null);
  assert.deepEqual(swapped.at(0), { item: 'dirt', amount: 3 });
  assert.deepEqual(swapped.at(1), { item: 'wood', amount: 2 });
  assert.equal(swapped.snapshot().cursor, null);
});

test('cancelar a transação devolve a pilha para o mundo quando todos os slots estão ocupados', () => {
  const slots = Array.from({ length: BELT_SIZE * 4 }, () => ({ item: 'wood', amount: 1 }));
  slots[0] = { item: 'wood', amount: 5 };
  const inventory = new Inventory(slots);
  assert.ok(inventory.click(bag(0)));
  assert.ok(inventory.distribute([bag(0), bag(1)]));
  assert.deepEqual(inventory.cancelCursorTransaction(), { item: 'wood', amount: 1 });
  assert.equal(inventory.snapshot().cursor, null);
  assert.ok(inventory.saveSlots().every(Boolean));
});

test('combinar, trocar e separar pilhas usa os mesmos slots para mochila e barra', () => {
  const pack = new Inventory();
  assert.ok(pack.move(bag(0), bag(8)));
  assert.equal(pack.at(8)?.item, 'pickaxe');
  assert.ok(pack.move(bag(3), bag(4)));
  assert.equal(pack.at(4)?.item, 'wood');
  assert.ok(pack.move(bag(4), bag(12), true));
  assert.equal(pack.at(12)?.amount, 1);
  assert.ok(pack.move(bag(12), bag(4)));
  assert.equal(pack.at(4)?.amount, 12);
  assert.ok(!pack.move(bag(4), bag(400)));
  assert.ok(!pack.move(bag(4), bag(4)));
  const view = pack.snapshot();
  view.slots[4]!.amount = 0;
  assert.equal(pack.at(4)?.amount, 12);
});
test('uma receita nova é reconhecida por posição relativa, orientação, lacunas e tamanho', () => {
  const output = { item: 'gold', amount: 3 };
  const book = new RecipeBook([
    {
      pattern: [
        ['coal', null, 'coal'],
        [null, 'wood', null],
      ],
      output,
    },
  ]);
  const items = (ids: (string | null)[]) => ids.map((id) => (id ? { item: id, amount: 10 } : null));
  assert.deepEqual(
    book.match(items([null, null, null, 'coal', null, 'coal', null, 'wood', null]), 3)?.output,
    output,
  );
  assert.equal(
    book.match(items(['coal', 'wood', 'coal', null, 'wood', null, null, null, null]), 3),
    undefined,
  );
  assert.equal(
    book.match(items([null, 'wood', null, 'coal', null, 'coal', null, null, null]), 3),
    undefined,
  );
  assert.equal(book.match(items(['coal', null, null, 'wood']), 2), undefined);
});
test('fechar, salvar e restaurar devolve ingredientes pendentes sem duplicação', () => {
  const pack = new Inventory(startingSlots({ plank: 4 }));
  pack.changeGrid(3);
  for (let i = 0; i < 4; i++) pack.move(bag(4), grid(i));
  const restored = new Inventory(pack.saveSlots());
  assert.equal(restored.count('plank'), 4);
  assert.equal(pack.count('plank'), 0);
  pack.changeGrid(2);
  assert.equal(pack.count('plank'), 4);
  assert.deepEqual(restored.snapshot(), pack.snapshot());
});
test('itens de drop e craft consumíveis são classificados pelos assets', () => {
  const game = new Expedition('ITEM-ASSETS');
  const selected = game.inventory.slots.findIndex((slot) => slot?.item === 'beef');
  assert.equal(selected, -1);
  const pack = new Inventory(startingSlots({ beef: 2 }));
  assert.equal(pack.count('beef'), 2);
  const book = new RecipeBook([
    { pattern: [['raw_meat']], output: { item: 'cooked_beef', amount: 1 } },
  ]);
  assert.deepEqual(
    book.match([{ item: 'raw_meat', amount: 1 }], 1)?.output,
    { item: 'cooked_beef', amount: 1 },
  );
});

test('blocos e ferramentas usam tiers de mineração', () => {
  const stone = Object.values(BLOCKS).find((block) => block.name === 'Pedra');
  const deep = Object.values(BLOCKS).find((block) => block.name === 'Rocha profunda');
  const crystal = Object.values(BLOCKS).find((block) => block.name === 'Cristal');
  const iron = Object.values(BLOCKS).find((block) => block.name === 'Ferro');
  assert.ok(stone?.mineTier === 2);
  assert.ok(deep?.mineTier === 3);
  assert.ok(iron?.mineTier === 4);
  assert.ok(crystal?.mineTier === 5);
  const pick = modularItems.pickaxe.config as unknown as { tool: { mineTier: number } };
  const stonePick = modularItems.stonePick.config as unknown as { tool: { mineTier: number } };
  const copper = modularItems.copperPick.config as unknown as { tool: { mineTier: number } };
  const ironPick = modularItems.ironPick.config as unknown as { tool: { mineTier: number } };
  const crystalPick = modularItems.crystalPick.config as unknown as { tool: { mineTier: number } };
  assert.ok(pick.tool.mineTier === 2);
  assert.ok(stonePick.tool.mineTier === 3);
  assert.ok(copper.tool.mineTier === 4);
  assert.ok(ironPick.tool.mineTier === 5);
  assert.ok(crystalPick.tool.mineTier === 6);
});

test('equipamentos definem níveis crescentes de golpe', () => {
  const sword = modularItems.sword.config as unknown as {
    hit: { damage: number; reach: number; cooldown: number };
  };
  const pickaxe = modularItems.pickaxe.config as unknown as {
    hit: { damage: number; reach: number; cooldown: number };
  };
  assert.ok(sword.hit.damage > pickaxe.hit.damage);
  assert.ok(pickaxe.hit.damage > 1);
  assert.ok(sword.hit.reach > pickaxe.hit.reach);

  const slime = new Slime(100, 100, 1);
  slime.hit(1, sword.hit.damage);
  slime.hit(1, sword.hit.damage);
  slime.hit(1, sword.hit.damage);
  assert.equal(slime.dead, true);
});

test('mobs preservam a direção da caminhada para espelhar o sprite', () => {
  const world = new World('FACING');
  const cow = new Cow(400, 100, 1);
  cow.hit(-1);
  assert.equal(cow.view().face, -1);

  const wolf = new Wolf(400, 100);
  wolf.hit(1);
  assert.equal(wolf.view().face, 1);
});

test('vacas podem entrar em modo amoroso e produzir um bezerro', () => {
  const a = new Cow(100, 100, 1);
  const b = new Cow(140, 100, 2);
  assert.equal(a.feed(), true);
  assert.equal(b.feed(), true);
  assert.equal(a.inLove, true);
  const calf = a.mate(b);
  assert.ok(calf);
  assert.equal(calf.view().baby, true);
  assert.equal(a.inLove, false);
});

test('entidades usam o brain apenas dentro do raio ativo', () => {
  const world = new World('ENTITY-AI');
  const player = { x: 100, y: 100, w: 18, h: 30, vx: 0, ground: true };
  const slime = new Slime(1000, 100, 42);
  slime.step(1 / 60, world, player, new RNG(42));
  assert.equal(slime.view().state, 'dormant');

  const nearby = new Slime(100, 100, 42);
  nearby.step(1 / 60, world, player, new RNG(42));
  assert.equal(nearby.view().state, 'active');
});

test('Q remove uma unidade da seleção e cria o item dropado no mundo', () => {
  const game = new Expedition('DROP-TEST');
  assert.equal(game.inventory.slots[0]?.item, 'pickaxe');
  assert.equal(game.dropSelected(), true);
  assert.equal(game.inventory.slots[0], null);
  assert.equal(game.scene({ x: game.player.x, y: game.player.y }).drops.length, 1);
  assert.equal(game.scene({ x: game.player.x, y: game.player.y }).drops[0].item, 'pickaxe');
  const restored = new Expedition('DROP-TEST', game.save());
  assert.equal(restored.scene({ x: restored.player.x, y: restored.player.y }).drops.length, 1);
});

test('somente uma bancada colocada e ao alcance abre a grade maior', () => {
  const game = new Expedition('AURORA-1264'),
    save = game.save();
  const x = Math.floor(save.player.x / TILE),
    y = Math.floor(save.player.y / TILE);
  const point = (col: number) => ({ x: (col + 0.5) * TILE, y: (y + 0.5) * TILE });
  assert.equal(game.openWorkbench(point(x + 1)), false);
  save.edits.push([y * WORLD_W + x + 1, B.WORKBENCH], [y * WORLD_W + x + 10, B.WORKBENCH]);
  const restored = new Expedition(save.seed, save);
  assert.equal(restored.openWorkbench(point(x + 10)), false);
  assert.ok(restored.openWorkbench(point(x + 1)));
  assert.equal(restored.inventory.size, 3);
  restored.closeCraft();
  assert.equal(restored.inventory.size, 2);
});
