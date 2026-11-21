import {
  BELT_SIZE,
  BLOCKS,
  placedTile,
  ITEMS,
  type Slot,
  type SlotRef,
  type Stack,
} from '../business';
import { drawExplorer } from './ExplorerSprite';
import { element, node } from './elements';
import type { ItemIcons } from './ItemIcons';
export interface BagModel {
  slots: readonly Slot[];
  equipment: readonly Slot[];
  grid: readonly Slot[];
  size: number;
  result: Slot;
  seed: string;
  slot: number;
  craftable: readonly { index: number; output: Stack }[];
  cursor: Slot;
  player: Parameters<typeof drawExplorer>[1];
}
export function address(ref: SlotRef) {
  return ref.area + '-' + ref.index;
}
export class InventoryView {
  constructor(private readonly icons: ItemIcons) {}
  private cell(slot: Slot, ref: SlotRef, selected: number) {
    const button = node('button', undefined, 'cell');
    button.dataset.cell = address(ref);
    const belt = ref.area === 'bag' && ref.index < BELT_SIZE;
    const label = ref.area === 'grid' ? 'Ingrediente' : ref.area === 'equipment' ? 'Armadura' : belt ? 'Atalho' : 'Mochila';
    button.title =
      label +
      ' ' +
      (ref.index + (ref.area === 'bag' && !belt ? 1 - BELT_SIZE : 1)) +
      ' · ' +
      (slot ? ITEMS[slot.item].name + ' × ' + slot.amount : 'Vazio');
    button.setAttribute('aria-label', button.title);
    button.draggable = false;
    if (belt) {
      button.append(node('small', String(ref.index + 1)));
      button.classList.toggle('equipped', ref.index === selected);
    }
    if (slot) this.decorate(button, slot);
    return button;
  }
  private decorate(button: HTMLElement, stack: Stack) {
    button.dataset.item = stack.item;
    button.append(this.icons.item(stack.item), node('b', String(stack.amount)));
    const max = ITEMS[stack.item].armor?.durability ?? ITEMS[stack.item].tool?.durability;
    if (max && stack.durability !== undefined) {
      const durability = node('span', undefined, 'durability');
      const ratio = stack.durability / max;
      durability.style.setProperty('--durability', String(ratio));
      durability.classList.toggle('critical', ratio < 0.2);
      button.append(durability);
      button.title += ` · Durabilidade ${stack.durability}/${max}`;
      button.setAttribute('aria-label', button.title);
    }
  }
  positionCursor(x: number, y: number) {
    const cursor = element('cursorStack');
    cursor.style.left = `${x + 12}px`;
    cursor.style.top = `${y + 12}px`;
  }
  showDistribution(cursor: Slot, amounts: ReadonlyMap<string, number> | null) {
    for (const cell of element('inventory').querySelectorAll<HTMLElement>('[data-cell]')) {
      const amount = amounts?.get(cell.dataset.cell!);
      cell.classList.toggle('over', amount !== undefined);
      cell.querySelector('.distribution-preview')?.remove();
      if (cursor && amount !== undefined) {
        const preview = node('span', undefined, 'distribution-preview');
        preview.setAttribute('aria-hidden', 'true');
        this.decorate(preview, { ...cursor, amount });
        cell.append(preview);
      }
    }
  }
  draw(m: BagModel) {
    element('bagSeed').textContent = m.seed;
    element('bag-title').textContent = m.size === 3 ? 'Bancada de fabricação' : 'Mochila de campo';
    element('craftSize').textContent = m.size + ' × ' + m.size;
    const grid = element('craftGrid');
    grid.style.setProperty('--side', String(m.size));
    grid.replaceChildren(...m.grid.map((s, i) => this.cell(s, { area: 'grid', index: i }, m.slot)));
    element('packSlots').replaceChildren(
      ...m.slots
        .slice(BELT_SIZE)
        .map((s, i) => this.cell(s, { area: 'bag', index: i + BELT_SIZE }, m.slot)),
    );
    element('beltSlots').replaceChildren(
      ...m.slots.slice(0, BELT_SIZE).map((s, i) => this.cell(s, { area: 'bag', index: i }, m.slot)),
    );
    element('equipmentSlots').replaceChildren(
      ...m.equipment.map((s, i) => this.cell(s, { area: 'equipment', index: i }, m.slot)),
    );
    this.drawPlayer(element<HTMLCanvasElement>('playerPreview'), m);
    const recipes = m.craftable.map(({ index, output }) => {
      const button = node('button', undefined, 'recipe-entry');
      button.dataset.recipe = String(index);
      button.title = `Preencher receita de ${ITEMS[output.item].name}`;
      button.setAttribute('aria-label', button.title);
      button.append(this.icons.item(output.item));
      if (output.amount > 1) button.append(node('b', String(output.amount)));
      return button;
    });
    element('recipeBookGrid').replaceChildren(...recipes);
    element('recipeBookEmpty').toggleAttribute('hidden', recipes.length > 0);
    const cursor = element('cursorStack');
    cursor.replaceChildren();
    cursor.toggleAttribute('hidden', !m.cursor);
    delete cursor.dataset.item;
    if (m.cursor) this.decorate(cursor, m.cursor);
    const result = element<HTMLButtonElement>('craftResult');
    result.replaceChildren();
    delete result.dataset.item;
    result.disabled = !m.result;
    result.draggable = false;
    result.title = m.result
      ? 'Recolher ' + ITEMS[m.result.item].name + ' × ' + m.result.amount
      : 'Aguardando uma combinação';
    result.setAttribute('aria-label', result.title);
    if (m.result) this.decorate(result, m.result);
    element('resultName').textContent = m.result ? ITEMS[m.result.item].name : 'Resultado';
    const station = Object.keys(ITEMS).find((id) => BLOCKS[placedTile(id) ?? -1]?.craftSize === 3);
    element('packEmblem').replaceChildren(
      m.size === 3 && station ? this.icons.item(station) : node('span', undefined, 'bag-icon'),
    );
  }
  private drawPlayer(canvas: HTMLCanvasElement, model: BagModel) {
    const c = canvas.getContext('2d')!;
    c.clearRect(0, 0, canvas.width, canvas.height);
    c.fillStyle = '#050505'; c.fillRect(0, 0, canvas.width, canvas.height);
    c.save();
    const scale = Math.min(canvas.width / 27, canvas.height / 38);
    c.translate(Math.round((canvas.width - 18 * scale) / 2), Math.round((canvas.height - 30 * scale) / 2));
    c.scale(scale, scale);
    drawExplorer(c, model.player, model.equipment);
    c.restore();
  }
}
