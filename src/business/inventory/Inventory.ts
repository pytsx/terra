import { ARMOR_SLOTS, BELT_SIZE, ITEMS, type Slot, type Stack, type SlotRef } from '../catalog';
import { recipes } from '../craft/RecipeBook';
import type { Recipe } from '../craft/RecipeBook';

const empty = (length: number): Slot[] => Array.from({ length }, () => null);
const clone = (slots: readonly Slot[]) => slots.map((s) => (s ? { ...s } : null));
function durabilityOf(item: string) {
  return ITEMS[item].armor?.durability ?? ITEMS[item].tool?.durability;
}
function createStack(item: string, amount: number): Stack {
  const durability = durabilityOf(item);
  return durability === undefined ? { item, amount } : { item, amount, durability };
}
function stackable(stack: Readonly<Stack>) {
  return !ITEMS[stack.item].unique && durabilityOf(stack.item) === undefined;
}
function compatible(a: Readonly<Stack>, b: Readonly<Stack>) {
  return a.item === b.item && stackable(a);
}
function store(slots: Slot[], stack: Stack) {
  // Durable gear represents an individual instance. It never carries a stack
  // quantity, even when a legacy save or an external drop supplies one.
  if (!stackable(stack) && stack.amount > 1) {
    for (let amount = 0; amount < stack.amount; amount++) store(slots, { ...stack, amount: 1 });
    return;
  }
  const existing = slots.find(
    (s) => s && compatible(s, stack) && Number.isSafeInteger(s.amount + stack.amount),
  );
  if (existing) {
    existing.amount += stack.amount;
    return;
  }
  let index = slots.findIndex((s, i) => i >= BELT_SIZE && !s);
  if (index < 0) index = slots.indexOf(null);
  if (index < 0) {
    index = slots.length;
    slots.push(...empty(BELT_SIZE));
  }
  slots[index] = { ...stack };
}
export function startingSlots(legacy: Record<string, number> = {}, gear: readonly string[] = []) {
  const slots = empty(BELT_SIZE * 4);
  const supplies: Stack[] = [];
  for (const [id, item] of Object.entries(ITEMS)) {
    const amount = legacy[id] ?? (gear.includes(id) ? 1 : (item.initial ?? 0));
    if (amount > 0) {
      const stack = createStack(id, amount);
      if (item.slot !== undefined) slots[item.slot] = stack;
      else supplies.push(stack);
    }
  }
  for (const stack of supplies) store(slots, stack);
  return slots;
}
export class Inventory {
  private readonly slots: Slot[];
  private readonly equipment: Slot[];
  private grid = empty(4);
  private station: Recipe['station'];
  private cursor: Slot = null;
  private cursorOrigin: SlotRef | null = null;
  constructor(slots: readonly Slot[] = startingSlots(), equipment: readonly Slot[] = empty(4)) {
    this.slots = clone(slots);
    // Migrate malformed old stacks of tools/armor into individual slots.
    for (let index = 0; index < this.slots.length; index++) {
      const stack = this.slots[index];
      if (!stack || stackable(stack) || stack.amount <= 1) continue;
      this.slots[index] = { ...stack, amount: 1 };
      for (let amount = 1; amount < stack.amount; amount++) store(this.slots, { ...stack, amount: 1 });
    }
    this.equipment = clone(equipment).slice(0, ARMOR_SLOTS.length);
    while (this.equipment.length < ARMOR_SLOTS.length) this.equipment.push(null);
  }
  get size() {
    return Math.sqrt(this.grid.length);
  }
  private cells(ref: SlotRef) {
    const slots = ref.area === 'bag' ? this.slots : ref.area === 'grid' ? this.grid :
      ref.area === 'equipment' ? this.equipment : undefined;
    return slots && Number.isInteger(ref.index) && ref.index >= 0 && ref.index < slots.length
      ? slots
      : undefined;
  }
  at(index: number): Readonly<Stack> | null {
    const stack = this.slots[index];
    return stack ? { ...stack } : null;
  }
  count(item: string) {
    return this.slots.reduce((n, s) => n + (s?.item === item ? s.amount : 0), 0);
  }
  collect(item: string, amount = 1, durability?: number) {
    const stack = createStack(item, amount);
    if (durability !== undefined && stack.durability !== undefined) stack.durability = durability;
    store(this.slots, stack);
  }
  exchangeOne(index: number, replacement: string) {
    const held = this.slots[index];
    if (!held) return;
    if (held.amount === 1) this.slots[index] = createStack(replacement, 1);
    else { held.amount--; this.collect(replacement); }
  }
  use(item: string, preferred?: number) {
    const index = preferred ?? this.slots.findIndex((s) => s?.item === item);
    const stack = this.slots[index];
    if (!stack || stack.item !== item) return false;
    if (--stack.amount === 0) this.slots[index] = null;
    return true;
  }
  move(from: SlotRef, to: SlotRef, single = false) {
    const src = this.cells(from),
      dst = this.cells(to);
    if (!src || !dst || (src === dst && from.index === to.index)) return false;
    const a = src[from.index],
      b = dst[to.index];
    if (!a) return false;
    if (to.area === 'equipment' && (ITEMS[a.item].armor?.slot !== ARMOR_SLOTS[to.index] || a.amount !== 1))
      return false;
    if (from.area === 'equipment' && to.area === 'grid') return false;
    // Cada gesto em direção à fórmula distribui uma unidade.
    const amount = single || to.area === 'grid' ? 1 : a.amount;
    if (a.durability !== undefined && amount !== a.amount) return false;
    if (b && !compatible(a, b)) {
      if (amount !== a.amount || src !== this.slots || dst !== this.slots) return false;
      src[from.index] = b;
      dst[to.index] = a;
      return true;
    }
    if (!Number.isSafeInteger((b?.amount ?? 0) + amount)) return false;
    dst[to.index] = { ...a, amount: (b?.amount ?? 0) + amount };
    a.amount -= amount;
    if (!a.amount) src[from.index] = null;
    return true;
  }
  click(ref: SlotRef) {
    const cells = this.cells(ref);
    if (!cells) return false;
    const target = cells[ref.index];
    if (!this.cursor) {
      if (!target) return false;
      this.cursor = target;
      this.cursorOrigin = { ...ref };
      cells[ref.index] = null;
      return true;
    }
    if (ref.area === 'equipment' &&
      (ITEMS[this.cursor.item].armor?.slot !== ARMOR_SLOTS[ref.index] || this.cursor.amount !== 1))
      return false;
    if (!target) {
      cells[ref.index] = this.cursor;
      this.cursor = null;
      this.cursorOrigin = null;
      return true;
    }
    if (compatible(target, this.cursor) && Number.isSafeInteger(target.amount + this.cursor.amount)) {
      target.amount += this.cursor.amount;
      this.cursor = null;
      this.cursorOrigin = null;
      return true;
    }
    cells[ref.index] = this.cursor;
    this.cursor = target;
    this.cursorOrigin = { ...ref };
    return true;
  }
  private distribution(refs: readonly SlotRef[]) {
    if (!this.cursor || !stackable(this.cursor)) return null;
    const unique = new Map<string, SlotRef>();
    for (const ref of refs) {
      const cells = this.cells(ref);
      if (ref.area === 'equipment' || !cells) continue;
      const target = cells[ref.index];
      if (!target || compatible(target, this.cursor)) unique.set(`${ref.area}-${ref.index}`, ref);
    }
    if (!unique.size) return null;
    const share = Math.floor(this.cursor.amount / unique.size);
    if (!share) return null;
    const slots = [];
    for (const [key, ref] of unique) {
      const cells = this.cells(ref)!;
      const total = (cells[ref.index]?.amount ?? 0) + share;
      if (!Number.isSafeInteger(total)) return null;
      slots.push({ key, cells, index: ref.index, total });
    }
    return { slots, remainder: this.cursor.amount % unique.size };
  }
  distribute(refs: readonly SlotRef[]) {
    const plan = this.distribution(refs);
    if (!plan || plan.slots.length < 2 || !this.cursor) return false;
    for (const { cells, index, total } of plan.slots)
      cells[index] = { ...this.cursor, amount: total };
    this.cursor = plan.remainder ? { ...this.cursor, amount: plan.remainder } : null;
    if (!this.cursor) this.cursorOrigin = null;
    return true;
  }
  distributionPreview(refs: readonly SlotRef[]) {
    const plan = this.distribution(refs);
    return plan ? new Map(plan.slots.map(({ key, total }) => [key, total])) : null;
  }
  private preview() {
    const output = recipes.match(this.grid, this.size, this.station)?.output;
    if (
      !output ||
      (ITEMS[output.item].unique &&
        [...this.slots, ...this.grid, ...this.equipment, this.cursor].some((s) => s?.item === output.item))
    )
      return null;
    return { ...output };
  }
  private availableCounts() {
    const counts = new Map<string, number>();
    for (const stack of [...this.slots, ...this.grid, this.cursor])
      if (stack) counts.set(stack.item, (counts.get(stack.item) ?? 0) + stack.amount);
    return counts;
  }
  private compatible(recipe: (typeof recipes.recipes)[number]) {
    return recipe.pattern.length <= this.size && recipe.pattern[0].length <= this.size &&
      (!recipe.station || recipe.station === this.station);
  }
  craftableRecipes() {
    const available = this.availableCounts();
    return recipes.recipes.map((recipe, index) => ({ recipe, index })).filter(({ recipe }) => {
      if (!this.compatible(recipe)) return false;
      if (ITEMS[recipe.output.item].unique &&
        [...this.slots, ...this.grid, ...this.equipment].some((s) => s?.item === recipe.output.item)) return false;
      const needed = new Map<string, number>();
      for (const item of recipe.pattern.flat()) if (item) needed.set(item, (needed.get(item) ?? 0) + 1);
      return [...needed].every(([item, amount]) => (available.get(item) ?? 0) >= amount);
    }).map(({ recipe, index }) => ({ index, output: { ...recipe.output } }));
  }
  fillRecipe(index: number) {
    const recipe = recipes.recipes[index];
    if (!recipe || !this.craftableRecipes().some((entry) => entry.index === index)) return false;
    if (this.cursor) {
      store(this.slots, this.cursor);
      this.cursor = null;
      this.cursorOrigin = null;
    }
    for (const stack of this.grid) if (stack) store(this.slots, stack);
    this.grid = empty(this.grid.length);
    recipe.pattern.forEach((row, y) => row.forEach((item, x) => {
      if (!item) return;
      const source = this.slots.findIndex((stack) => stack?.item === item);
      const stack = this.slots[source]!;
      this.grid[y * this.size + x] = { item, amount: 1 };
      if (--stack.amount === 0) this.slots[source] = null;
    }));
    return true;
  }
  takeResult(to?: SlotRef) {
    const result = this.preview();
    if (!result) return null;
    if (to) {
      if (to.area !== 'bag' || !this.cells(to)) return null;
      const target = this.slots[to.index];
      if (
        target &&
        (!compatible(target, result) || !Number.isSafeInteger(target.amount + result.amount))
      )
        return null;
      this.slots[to.index] = target
        ? { ...target, amount: target.amount + result.amount }
        : createStack(result.item, result.amount);
    } else {
      // Crafted resources extend an existing inventory stack before consuming a
      // new slot. Gear is deliberately incompatible and remains individual.
      const existing = this.slots.find((slot) => slot && compatible(slot, result));
      if (existing && Number.isSafeInteger(existing.amount + result.amount)) {
        existing.amount += result.amount;
      } else {
      let destination = this.slots.findIndex((slot, index) => index < BELT_SIZE && !slot);
      if (destination < 0) destination = this.slots.findIndex((slot, index) => index >= BELT_SIZE && !slot);
      if (destination >= 0) this.slots[destination] = createStack(result.item, result.amount);
      else if (!this.cursor) {
        this.cursor = createStack(result.item, result.amount);
        this.cursorOrigin = null;
      }
      else if (compatible(this.cursor, result) && Number.isSafeInteger(this.cursor.amount + result.amount))
        this.cursor.amount += result.amount;
      else return null;
      }
    }
    this.grid.forEach((s, i) => {
      if (s && --s.amount === 0) this.grid[i] = null;
    });
    return result;
  }
  changeGrid(size: 2 | 3, station: Recipe['station'] = size === 3 ? 'workbench' : undefined) {
    for (const stack of this.grid) if (stack) store(this.slots, stack);
    this.grid = empty(size * size);
    this.station = station;
  }
  cancelCursorTransaction() {
    const stack = this.cursor;
    const origin = this.cursorOrigin;
    this.cursor = null;
    this.cursorOrigin = null;
    if (!stack) return null;

    if (origin && origin.area !== 'grid') {
      const cells = this.cells(origin);
      if (cells && !cells[origin.index]) {
        cells[origin.index] = stack;
        return null;
      }
    }
    const emptySlot = this.slots.indexOf(null);
    if (emptySlot >= 0) {
      this.slots[emptySlot] = stack;
      return null;
    }
    return { ...stack };
  }
  saveSlots() {
    const slots = clone(this.slots);
    if (this.cursor) store(slots, this.cursor);
    for (const stack of this.grid) if (stack) store(slots, stack);
    return slots;
  }
  saveEquipment() { return clone(this.equipment); }
  maxLife() {
    return 5 + this.equipment.reduce((sum, stack) => sum + (stack ? ITEMS[stack.item].armor?.bonusLife ?? 0 : 0), 0);
  }
  wearSelected(index: number) {
    const stack = this.slots[index], max = stack ? durabilityOf(stack.item) : undefined;
    if (!stack || max === undefined) return null;
    stack.durability = Math.max(0, (stack.durability ?? max) - 1);
    if (stack.durability > 0) return { item: stack.item, broken: false };
    const item = stack.item;
    this.slots[index] = null;
    return { item, broken: true };
  }
  wearArmor() {
    const broken: string[] = [];
    this.equipment.forEach((stack, index) => {
      if (!stack) return;
      const max = ITEMS[stack.item].armor?.durability;
      if (!max) return;
      stack.durability = Math.max(0, (stack.durability ?? max) - 1);
      if (!stack.durability) {
        broken.push(stack.item);
        this.equipment[index] = null;
      }
    });
    return broken;
  }
  held() { return this.cursor && { ...this.cursor }; }
  belt() { return clone(this.slots.slice(0, BELT_SIZE)); }
  snapshot() {
    return {
      slots: clone(this.slots),
      equipment: clone(this.equipment),
      grid: clone(this.grid),
      size: this.size,
      result: this.preview(),
      craftable: this.craftableRecipes(),
      cursor: this.held(),
    };
  }
}
