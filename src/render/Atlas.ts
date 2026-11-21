import { BLOCKS, BLOCK_SCRIPTS, TILE } from '../business';
export class Atlas {
  private readonly tiles = new Map<number, HTMLCanvasElement[]>();
  constructor() {
    for (const block of Object.values(BLOCKS)) {
      this.tiles.set(
        block.id,
        Array.from({ length: 4 }, (_, variant) => this.makeTile(block.id, variant)),
      );
    }
  }
  private makeTile(id: number, variant: number) {
    const tile = document.createElement('canvas');
    tile.width = tile.height = TILE;
    const c = tile.getContext('2d')!;
    c.imageSmoothingEnabled = false;
    BLOCK_SCRIPTS[id].placed.render(c, variant);
    return tile;
  }
  tile(c: CanvasRenderingContext2D, id: number, x: number, y: number, variant = 0) {
    const tile = this.tiles.get(id)?.[variant % 4];
    if (tile) c.drawImage(tile, x, y);
  }
}
