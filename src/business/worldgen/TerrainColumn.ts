import { B, CHUNK_WIDTH as W, CHUNK_HEIGHT as H } from '../catalog';
import { RNG, mixHash } from '../../shared/math';
import { climateGenerator, terrainPipeline } from './index';
import type { ClimateSample } from './types';
import { Landscape } from './Landscape';

/** The climate profile is shared by every vertical section of the column. */
export class TerrainColumn {
  readonly surface = new Int16Array(W);
  private readonly climate: ClimateSample[] = [];
  private readonly minSurface: number;
  private readonly maxSurface: number;
  private readonly originX: number;
  private readonly rngSeed: number;
  readonly landscape?: Landscape;

  constructor(private readonly seed: number, cx: number, private readonly height: number,
    private readonly spawnX: number, private readonly version: number) {
    this.originX = cx * W;
    this.rngSeed = mixHash(seed, cx, 0x4c11);
    if (version >= 4) {
      this.landscape = new Landscape(seed, this.originX, W);
      this.climate = this.landscape.climate;
      for (let x = 0; x < W; x++) this.surface[x] = this.landscape.height(x);
    } else climateGenerator.generate({
      width: W, seed, surface: this.surface, climate: this.climate, globalX: (x) => this.originX + x,
    });
    this.minSurface = Math.min(...this.surface);
    this.maxSurface = Math.max(...this.surface);
  }

  generate(cy: number): Uint16Array {
    const top = cy * H, bottom = Math.min(top + H, this.height);
    // Trees depend on their neighbours' surface and on earlier draws from this column's RNG.
    // Keep that surface available as scratch space when a canopy could cross the section.
    const startY = top <= this.maxSurface ? Math.min(top, this.minSurface) : top;
    const endY = top <= this.maxSurface ? Math.max(bottom, this.maxSurface + 1) : bottom;
    const cells = new Uint16Array((endY - startY) * W);
    terrainPipeline.run({
      landscape: this.landscape, seed: this.seed, width: W, height: this.height, originX: this.originX,
      generationVersion: this.version,
      spawnX: this.spawnX - this.originX, climate: this.climate, surface: this.surface,
      globalX: (x) => this.originX + x, rng: new RNG(this.rngSeed), startY, endY,
      get: (x, y) => y < 0 ? B.AIR : x < 0 || x >= W || y < startY || y >= endY
        ? B.BEDROCK : cells[(y - startY) * W + x],
      set: (x, y, id) => {
        if (x >= 0 && x < W && y >= startY && y < endY) cells[(y - startY) * W + x] = id;
      },
    });
    return startY === top && endY === bottom ? cells : cells.slice((top - startY) * W, (bottom - startY) * W);
  }
}
