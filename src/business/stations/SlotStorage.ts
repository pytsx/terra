import type { Slot, Stack } from '../EngineTypes';

export function countItem(slots: readonly Slot[], item: string) {
  return slots.reduce((total, slot) => total + (slot?.item === item ? slot.amount : 0), 0);
}

export function canStore(slots: readonly Slot[], stacks: readonly Stack[], limit: number) {
  const copy = cloneSlots(slots);
  return stacks.every(stack => store(copy, stack, limit) === 0);
}

export function store(slots: Slot[], stack: Readonly<Stack>, limit: number) {
  let left = stack.amount;
  for (const slot of slots) {
    if (slot?.item !== stack.item || slot.durability !== stack.durability) continue;
    const added = Math.max(0, Math.min(left, limit - slot.amount));
    slot.amount += added;
    left -= added;
  }
  for (let index = 0; left && index < slots.length; index++) {
    if (slots[index]) continue;
    const added = Math.min(left, limit);
    slots[index] = { ...stack, amount: added };
    left -= added;
  }
  return left;
}

export function storeAt(slots: Slot[], index: number, stack: Readonly<Stack>, limit: number) {
  const slot = slots[index];
  if (slot && (slot.item !== stack.item || slot.durability !== stack.durability)) return stack.amount;
  const added = Math.max(0, Math.min(stack.amount, limit - (slot?.amount ?? 0)));
  if (added) slots[index] = { ...stack, amount: (slot?.amount ?? 0) + added };
  return stack.amount - added;
}

export function take(slots: Slot[], item: string, amount: number) {
  let left = amount;
  for (let index = 0; left && index < slots.length; index++) {
    const slot = slots[index];
    if (slot?.item !== item) continue;
    const used = Math.min(left, slot.amount);
    slot.amount -= used;
    left -= used;
    if (!slot.amount) slots[index] = null;
  }
  return left === 0;
}

export function takeAt(slots: Slot[], index: number, amount = Infinity) {
  const slot = slots[index];
  if (!slot || !(amount === Infinity || Number.isSafeInteger(amount) && amount > 0)) return null;
  const moved = Math.min(slot.amount, amount);
  const result = { ...slot, amount: moved };
  slot.amount -= moved;
  if (!slot.amount) slots[index] = null;
  return result;
}

export const cloneSlots = (slots: readonly Slot[]) => slots.map(slot => slot ? { ...slot } : null);
