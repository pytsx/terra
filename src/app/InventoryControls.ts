import { ITEMS, type SlotRef, type Expedition } from '../business';
import { element, type Views } from '../render';

function refOf(target: EventTarget | null): SlotRef | null {
  const cell = target instanceof Element ? target.closest<HTMLElement>('[data-cell]') : null;
  const parts = cell?.dataset.cell?.match(/^(bag|grid|equipment)-(\d+)$/);
  return parts ? { area: parts[1] as SlotRef['area'], index: Number(parts[2]) } : null;
}

export class InventoryControls {
  private readonly dialog = element<HTMLDialogElement>('inventory');
  private pointerId: number | null = null;
  private ignorePointerClick = false;
  private manualStation: string | null = null;
  private readonly targets = new Map<string, SlotRef>();


  constructor(
    private readonly game: () => Expedition,
    private readonly refresh: () => void,
    private readonly view: Views['bag'],
  ) {
    const stop = () => {
      if (this.manualStation) this.game().stationAction(this.manualStation, 'stop');
      this.manualStation = null;
    };
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    window.addEventListener('blur', stop);
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
    this.dialog.addEventListener('pointerdown', event => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-station-action="start"]') : null;
      const model = this.game().stationModel;
      if (target && model && event.button === 0 && this.game().stationAction(model.id, 'start')) {
        this.manualStation = model.id;
        event.preventDefault();
      }
    });
    window.addEventListener('pointermove', (event) => {
      if (!this.dialog.open) return;
      this.view.positionCursor(event.clientX, event.clientY);
      if (event.pointerId !== this.pointerId) return;
      this.addTarget(document.elementFromPoint(event.clientX, event.clientY));
    });
    this.dialog.addEventListener('pointerdown', (event) => {
      if (!this.dialog.open || event.button !== 0 || !event.isPrimary) return;
      this.ignorePointerClick = false;
      this.view.positionCursor(event.clientX, event.clientY);
      if (!refOf(event.target) || !this.game().cursorStack) return;
      this.pointerId = event.pointerId;
      this.addTarget(event.target);
      (event.target as Element).setPointerCapture(event.pointerId);
    });
    window.addEventListener('pointerup', (event) => {
      if (event.pointerId !== this.pointerId) return;
      if (this.targets.size > 1) {
        this.ignorePointerClick = true;
        if (this.game().distributeStack([...this.targets.values()])) this.refresh();
      }
      this.cancelDrag(false);
    });
    window.addEventListener('pointercancel', (event) => {
      if (event.pointerId === this.pointerId) this.cancelDrag();
    });
    window.addEventListener('blur', () => this.cancelDrag());
    this.dialog.addEventListener('click', (event) => {
      if (!this.dialog.open) return;
      if (this.ignorePointerClick && event.detail > 0) {
        this.ignorePointerClick = false;
        return;
      }
      const model = this.game().stationModel;
      if (model && event.target instanceof Element) {
        const slot = event.target.closest<HTMLElement>('[data-station-slot]');
        const action = event.target.closest<HTMLElement>('[data-station-action]');
        if (slot) {
          const [area, index] = slot.dataset.stationSlot!.split('-');
          this.game().stationAction(model.id, 'slot', area as 'input' | 'fuel' | 'output', Number(index), event.shiftKey ? 1 : undefined);
          this.refresh(); return;
        }
        if (action) {
          if (action.dataset.stationAction !== 'start') this.game().stationAction(model.id, action.dataset.stationAction!);
          this.refresh(); return;
        }
        if (event.target.closest('#craftGrid, #craftResult, [data-recipe]')) return;
      }
      const recipe = event.target instanceof Element
        ? event.target.closest<HTMLElement>('[data-recipe]') : null;
      if (recipe) {
        if (recipe.dataset.available !== 'true') {
          this.game().inspectRecipe(Number(recipe.dataset.recipe));
          element('bagFeedback').textContent = 'Prévia da receita · reúna os ingredientes para fabricar.';
          this.refresh();
          return;
        }
        if (this.game().fillRecipe(Number(recipe.dataset.recipe))) {
          element('bagFeedback').textContent = 'Receita colocada na grade.';
          this.refresh();
        }
        return;
      }
      const resultButton = event.target instanceof Element
        ? event.target.closest<HTMLElement>('#craftResult') : null;
      if (resultButton) {
        const result = this.game().takeResult();
        if (!result) {
          element('bagFeedback').textContent = 'Libere um slot ou deposite a pilha do cursor para recolher o resultado.';
          return;
        }
        element('bagFeedback').textContent = `Fabricado · ${result.amount} × ${ITEMS[result.item].name}`;
        this.refresh();
        return;
      }
      const ref = refOf(event.target);
      if (ref?.area === 'grid' && element('craftGrid').classList.contains('recipe-preview')) return;
      if (!ref || !this.game().clickStack(ref)) return;
      const cursor = this.game().cursorStack;
      element('bagFeedback').textContent = cursor
        ? `${ITEMS[cursor.item].name} na mão`
        : '';
      this.refresh();
    });
    this.dialog.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  reset() {
    if (this.manualStation) this.game().stationAction(this.manualStation, 'stop');
    this.manualStation = null;
    this.cancelDrag();
  }

  private addTarget(target: EventTarget | null) {
    const ref = refOf(target);
    if (!ref) return;
    const key = `${ref.area}-${ref.index}`;
    if (this.targets.has(key)) return;
    this.targets.set(key, ref);
    const game = this.game();
    this.view.showDistribution(game.cursorStack, game.distributionPreview([...this.targets.values()]));
  }

  private cancelDrag(suppressClick = true) {
    if (this.pointerId === null) return;
    if (suppressClick) this.ignorePointerClick = true;
    this.pointerId = null;
    this.targets.clear();
    this.view.showDistribution(null, null);
  }
}
