import test from 'node:test';
import assert from 'node:assert/strict';
import { ARMOR_SLOTS, BELT_SIZE, ITEMS, type Slot } from '../src/business/catalog';
import { Inventory } from '../src/business/inventory/Inventory';
import { defaultContent } from '../src/assets/runtime';
const recipes = defaultContent.recipes;
const createInventory = (slots?: readonly Slot[], equipment?: readonly Slot[]) => new Inventory(defaultContent.recipes, defaultContent.materials, slots, equipment);

const emptyBag = () => Array.from({ length: BELT_SIZE * 4 }, (): Slot => null);

test('armaduras só entram no slot correto, aumentam a vida e quebram ao fim da durabilidade', () => {
  const slots = emptyBag();
  slots[8] = { item: 'leatherHelmet', amount: 1, durability: 2 };
  const bag = createInventory(slots);
  assert.equal(bag.move({ area: 'bag', index: 8 }, { area: 'equipment', index: 1 }), false);
  assert.equal(bag.move({ area: 'bag', index: 8 }, { area: 'equipment', index: 0 }), true);
  assert.equal(bag.maxLife(), 5 + ITEMS.leatherHelmet.armor!.bonusLife);
  assert.deepEqual(bag.wearArmor(), []);
  assert.equal(bag.snapshot().equipment[0]?.durability, 1);
  assert.deepEqual(bag.wearArmor(), ['leatherHelmet']);
  assert.equal(bag.snapshot().equipment[0], null);
  assert.equal(bag.maxLife(), 5);
});

test('ferramentas conservam durabilidade ao mover e desaparecem no último uso', () => {
  const slots = emptyBag();
  slots[0] = { item: 'pickaxe', amount: 1, durability: 2 };
  const bag = createInventory(slots);
  assert.equal(bag.move({ area: 'bag', index: 0 }, { area: 'bag', index: 9 }), true);
  assert.equal(bag.snapshot().slots[9]?.durability, 2);
  assert.deepEqual(bag.wearSelected(9), { item: 'pickaxe', broken: false });
  assert.deepEqual(bag.wearSelected(9), { item: 'pickaxe', broken: true });
  assert.equal(bag.snapshot().slots[9], null);
});

test('as quatro armaduras existem nos assets e suas receitas exigem bancada', () => {
  for (const [index, id] of ['leatherHelmet', 'leatherChestplate', 'leatherLeggings', 'leatherBoots'].entries()) {
    assert.equal(ITEMS[id].armor?.slot, ARMOR_SLOTS[index]);
    const recipe = recipes.recipes.find((entry) => entry.output.item === id);
    assert.equal(recipe?.station, 'workbench');
  }
});
