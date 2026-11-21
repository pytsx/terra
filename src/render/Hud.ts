import { BELT_SIZE, TILE, type Scene, type Slot } from '../business';
import { element, node } from './elements';
import type { ItemIcons } from './ItemIcons';
export class Hud {
  private toastTimer = 0;
  constructor(private readonly icons: ItemIcons) {
    element('hotbar').replaceChildren(
      ...Array.from({ length: BELT_SIZE }, (_, i) => {
        const button = node('button', undefined, 'slot');
        button.dataset.slot = String(i);
        button.append(node('small', String(i + 1)), node('span'), node('b'));
        return button;
      }),
    );
  }
  update(scene: Scene, slots: readonly Slot[]) {
    const p = scene.player,
      x = Math.floor(p.x / TILE),
      y = Math.floor(p.y / TILE);
    element('coordinate').textContent = x + ' / ' + y;
    const depth = Math.max(0, y - scene.world.heightAt(x)),
      phase = (scene.elapsed / 240 + 0.18) % 1;
    const location =
      depth > 10
        ? 'Cavernas'
        : scene.world.biomeAt(x);
    element('region').textContent =
      (phase > 0.52 && phase < 0.94 ? 'Noite' : 'Dia') +
      ' · ' +
      location +
      (depth ? ' · ' + depth * 2 + ' m' : '');
    const hearts = element('hearts');
    hearts.setAttribute('aria-label', 'Vida ' + p.life + ' de ' + p.maxLife);
    hearts.replaceChildren(
      document.createTextNode('♥'.repeat(p.life)),
      node('i', '♥'.repeat(Math.max(0, p.maxLife - p.life))),
    );
    element('menuSeed').textContent = scene.world.seed;
    element('zoomLabel').textContent = Math.round(scene.zoom * 100) + '%';
    const label = (id: string) => this.icons.materials.items[id].name;
    element('selectedName').textContent = scene.heldName;
    for (const button of element('hotbar').querySelectorAll<HTMLButtonElement>('button')) {
      const index = Number(button.dataset.slot),
        stack = slots[index];
      button.setAttribute('aria-pressed', String(scene.slot === index));
      const icon =
        index === scene.slot && scene.heldIcon ? scene.heldIcon : (stack?.item ?? '');
      if (button.dataset.icon !== icon) {
        button.dataset.icon = icon;
        button.querySelector('span')!.replaceChildren(...(icon ? [this.icons.item(icon)] : []));
        button.title = (stack ? label(stack.item) : 'Vazio') + ' (' + (index + 1) + ')';
        button.setAttribute('aria-label', button.title);
      }
      button.querySelector('b')!.textContent =
        stack && stack.amount > 1 ? String(stack.amount) : '';
    }
  }
  message(text: string) {
    const el = element('toast');
    el.textContent = text;
    el.classList.add('show');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => el.classList.remove('show'), 2400);
  }
}
