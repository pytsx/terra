import { Atlas } from './Atlas';
import { ImpactAudio } from './ImpactAudio';
import { ItemIcons } from './ItemIcons';
import { WorldRenderer } from './WorldRenderer';
import { InventoryView } from './InventoryView';
import { Hud } from './Hud';
import { element } from './elements';
import { WorldMapView } from './WorldMapView';
export { element };
export type { BagModel } from './InventoryView';
export function createViews() {
  const atlas = new Atlas(),
    icons = new ItemIcons(atlas);
  const canvas = element<HTMLCanvasElement>('game');
  return {
    canvas,
    audio: new ImpactAudio(),
    world: new WorldRenderer(canvas, element<HTMLCanvasElement>('minimap'), atlas),
    map: new WorldMapView(
      element<HTMLCanvasElement>('worldMapCanvas'),
      element<HTMLOutputElement>('mapZoomLabel'),
      element('mapViewPosition'),
    ),
    bag: new InventoryView(icons),
    hud: new Hud(icons),
  };
}
export type Views = ReturnType<typeof createViews>;
