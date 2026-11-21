import { placement } from '../business/content/Materials';

import type { Atlas } from './Atlas';
import { node } from './elements';
export class ItemIcons {
  constructor(private readonly atlas: Atlas) {}
  get materials() { return this.atlas.content.materials; }
  item(id: string) {
    const tile = placement(this.materials, id),
      item = this.materials.items[id];
    if (tile !== undefined) return this.draw(tile);
    const asset = this.materials.itemAssets[id];
    if (asset?.script.renderInventory) {
      const icon = node('canvas', undefined, 'item-icon');
      icon.width = icon.height = 30;
      const c = icon.getContext('2d')!;
      c.imageSmoothingEnabled = false;
      asset.script.renderInventory(c);
      return icon;
    }
    const icon = node('canvas', undefined, 'item-icon');
    icon.width = icon.height = 30;
    const c = icon.getContext('2d')!;
    c.fillStyle = item.color ?? '#c7bd91';
    c.fillRect(6, 6, 18, 18);
    return icon;
  }
  draw(item: number) {
    const canvas = node('canvas', undefined, 'item-icon');
    canvas.width = canvas.height = 30;
    canvas.setAttribute('aria-hidden', 'true');
    const c = canvas.getContext('2d')!;
    c.imageSmoothingEnabled = false;
    if (typeof item === 'number') this.atlas.tile(c, item, 3, 3);
    return canvas;
  }
}
