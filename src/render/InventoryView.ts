import {
  BELT_SIZE,
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
  recipePreview?: readonly Slot[];
  size: number;
  station?: string;
  processing?: import('../business/Expedition').Expedition['stationModel'];
  result: Slot;
  seed: string;
  slot: number;
  craftable: readonly {
    index: number;
    output: Stack;
    station?: string;
    requirements: readonly { item: string; amount: number }[];
    available: boolean;
  }[];
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
      (slot ? this.icons.materials.items[slot.item].name + ' × ' + slot.amount : 'Vazio');
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
    const max = this.icons.materials.items[stack.item].armor?.durability ?? this.icons.materials.items[stack.item].tool?.durability;
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
    const dialog = element('inventory');
    dialog.classList.toggle('station-mode', !!m.station || !!m.processing);
    dialog.classList.toggle('processing-mode', !!m.processing);
    dialog.classList.remove('station-mill', 'station-oven');
    element('bagSeed').textContent = m.station ? '' : m.seed;
    element('bag-title').textContent = m.processing?.name ?? (m.station ? this.icons.materials.items[m.station]?.name ?? m.station : 'Mochila de campo');
    element('craftSize').textContent = m.processing ? '' : m.size + ' × ' + m.size;
    const grid = element('craftGrid');
    grid.style.setProperty('--side', String(m.size));
    grid.classList.toggle('recipe-preview', !!m.recipePreview);
    grid.replaceChildren(...(m.recipePreview ?? m.grid).map((s, i) => this.cell(s, { area: 'grid', index: i }, m.slot)));
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
    const recipes = m.craftable.map(({ index, output, requirements, available }) => {
      const button = node('button', undefined, 'recipe-entry');
      button.dataset.recipe = String(index);
      button.dataset.available = String(available);
      button.setAttribute('aria-disabled', String(!available));
      button.classList.toggle('unavailable', !available);
      const ingredients = requirements.map(({ item, amount }) => `${this.icons.materials.items[item].name} × ${amount}`).join(', ');
      button.title = `Preencher receita de ${this.icons.materials.items[output.item].name} · Necessário: ${ingredients}`;
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
      ? 'Recolher ' + this.icons.materials.items[m.result.item].name + ' × ' + m.result.amount
      : 'Aguardando uma combinação';
    result.setAttribute('aria-label', result.title);
    if (m.result) this.decorate(result, m.result);
    element('resultName').textContent = m.result ? this.icons.materials.items[m.result.item].name : 'Resultado';
    this.drawProcessing(m.processing);
    const station = m.processing?.definitionId ?? m.station;
    element('packEmblem').replaceChildren(
      m.processing ? this.icons.draw(m.processing.block) :
        station && this.icons.materials.items[station] ? this.icons.item(station) : node('span', undefined, 'bag-icon'),
    );
  }
  private drawProcessing(model: BagModel['processing']) {
    const host = element('craftGrid').closest('.craft-station')!;
    let panel = host.querySelector<HTMLElement>('.processing-panel');
    if (!model) { panel?.remove(); return; }
    if (!panel || panel.dataset.stationId !== model.id) {
      panel?.remove(); panel = node('section', undefined, 'processing-panel');
      panel.dataset.stationId = model.id;
      for (const area of ['input', 'fuel', 'output'] as const) {
        const group = node('div', undefined, 'processing-row');
        group.append(node('span', {input:'Entrada',fuel:'Combustível',output:'Saída'}[area]));
        const slots = node('div', undefined, 'processing-slots');
        slots.dataset.area = area;
        group.append(slots); panel.append(group);
      }
      const status = node('p', undefined, 'processing-status');
      const progress = node('progress'); progress.max = 1;
      const thermal = node('p', undefined, 'processing-thermal');
      const controls = node('div', undefined, 'processing-controls');
      for (const [action, label] of [['enable','Ativar / Pausar'],['cancel','Cancelar lote'],['start','Segure para trabalhar']]) {
        const button = node('button', label);
        button.dataset.stationAction = action;
        if (action !== 'start' || model.manual) controls.append(button);
      }
      panel.append(status, progress, thermal, controls);
      host.append(panel);
    }
    for (const area of ['input','fuel','output'] as const) {
      const group = panel.querySelector<HTMLElement>('[data-area="' + area + '"]')!;
      (group.parentElement as HTMLElement).hidden = model[area].length === 0;
      group.replaceChildren(...model[area].map((slot, index) => {
        const button = node('button', undefined, 'cell');
        button.dataset.stationSlot = area + '-' + index;
        button.title = slot ? this.icons.materials.items[slot.item].name + ' × ' + slot.amount : 'Vazio';
        button.setAttribute('aria-label', button.title);
        if (slot) this.decorate(button, slot);
        return button;
      }));
    }
    panel.querySelector('.processing-status')!.textContent = model.status + (model.enabled ? '' : ' · Desativada');
    panel.querySelector('progress')!.value = model.progress;
    panel.querySelector('.processing-thermal')!.textContent = model.manual ? 'Trabalho manual' :
      model.energy === 'hydraulic' ? 'Roda hidráulica · instale sobre água corrente' :
      Math.floor(model.temperature) + ' °C · ' + (model.burningFuel ? Math.ceil(model.burningFuel.remainingSeconds) + ' s de combustível' : 'Sem chama');
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
