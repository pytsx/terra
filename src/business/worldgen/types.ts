import type { RNG } from '../../shared/math';

export interface ClimateSample {
  continentalness: number;
  erosion: number;
  weirdness: number;
  peaksValleys: number;
  temperature: number;
  humidity: number;
}

export interface GenerationContext {
  readonly generationVersion: number;
  readonly landscape?: import('./Landscape').Landscape;
  readonly seed: number;
  readonly width: number;
  readonly originX: number;
  readonly height: number;
  readonly startY: number;
  readonly endY: number;
  readonly spawnX: number;
  readonly surface: Int16Array;
  readonly climate: ClimateSample[];
  readonly rng: RNG;
  get(x: number, y: number): number;
  set(x: number, y: number, block: number): void;
  globalX(x: number): number;
}

export interface WorldGenerator {
  readonly name: string;
  generate(context: GenerationContext): void;
}

export class GenerationPipeline {
  constructor(readonly stages: readonly WorldGenerator[]) {}
  run(context: GenerationContext) {
    for (const stage of this.stages) stage.generate(context);
  }
}
