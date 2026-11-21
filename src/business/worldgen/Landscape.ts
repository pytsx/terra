import { clamp, noise1, rand01, smooth } from '../../shared/math';
import { ClimateGenerator } from './ClimateGenerator';
import type { ClimateSample } from './types';

export type Biome = 'Pradaria' | 'Floresta temperada' | 'Bosque de coníferas' | 'Serra rochosa' | 'Dunas';

/** Samples relief, climate and biomes, without placing world features. */
export class Landscape {
  private readonly margin = 4;
  private readonly elevations: Int16Array;
  private readonly biomes: Biome[] = [];
  readonly climate: ClimateSample[];

  constructor(seed: number, origin: number, width: number) {
    this.elevations = new Int16Array(width + this.margin * 2);
    const samples: ClimateSample[] = [];
    new ClimateGenerator().generate({
      seed, width: this.elevations.length, surface: this.elevations, climate: samples,
      globalX: i => origin + i - this.margin,
    });
    for (let i = 0; i < this.elevations.length; i++) {
      const x = origin + i - this.margin, climate = samples[i];
      const range = Math.floor(x / 360);
      const summit = (range + 0.31 + rand01(range, 1, seed) * 0.38) * 360;
      const slope = smooth(Math.max(0, 1 - Math.abs(x - summit) / 108));
      const relief = slope * (32 + 12 * rand01(range, 2, seed) + 12 * noise1(x / 22, seed));
      const arid = climate.temperature > 0.1 && climate.humidity < -0.03;
      const forest = climate.humidity + noise1(x / 105, seed ^ 673) * 0.8 > 0.33;
      this.biomes[i] = relief > 34 ? 'Serra rochosa' : relief > 18 ? 'Bosque de coníferas' :
        arid ? 'Dunas' : forest ? 'Floresta temperada' : 'Pradaria';
      const dunes = arid ? 5 * noise1(x / 18, seed ^ 893) : 0;
      this.elevations[i] = clamp(Math.round(10 + this.elevations[i] * 0.94 - relief - dunes), 14, 116);
    }
    this.climate = samples.slice(this.margin, this.margin + width);
  }

  biome(x: number) { return this.biomes[x + this.margin]; }
  height(x: number) { return this.elevations[x + this.margin]; }
}
